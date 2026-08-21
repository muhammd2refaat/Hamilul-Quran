from collections import defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.features.allocations.models import Allocation
from app.features.complaints.models import Complaint
from app.features.dashboard.schemas import (
    AttendancePoint,
    DashboardMetrics,
    RecentSignup,
    ScorePoint,
    SignupPoint,
    TeacherScoreboardItem,
)
from app.features.sessions.models import SessionScore
from app.features.sessions.service import SessionService
from app.features.subscriptions.models import Subscription
from app.features.users.models import User, UserRole

# Session scores are stored as (score, max_score) pairs on their own scale
# (e.g. 17/20), not a fixed 0-100 range — every average below normalizes to
# a percentage so different max_score values are comparable.
_SCORE_PCT = func.avg(SessionScore.score * 100.0 / SessionScore.max_score)


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_metrics(self, months: int = 6) -> DashboardMetrics:
        months = max(1, min(months, 24))

        role_counts = await self._counts_by(User.role)
        status_counts = await self._counts_by(User.status)
        complaint_status_counts = await self._counts_by(Complaint.status)

        total_allocations_result = await self.session.exec(
            select(func.count()).select_from(Allocation)
        )
        total_allocations = total_allocations_result.one()

        total_countries_result = await self.session.exec(
            select(func.count(func.distinct(User.country))).where(User.country.is_not(None))
        )
        total_countries = total_countries_result.one()

        signups_by_month = await self._signups_by_month(months)
        recent_signups = await self._recent_signups()

        avg_score_pct, score_trend, top_teachers = await self._score_stats(months)
        attendance_rate, attendance_trend = await self._attendance_stats()
        subs_by_status, subs_by_plan = await self._subscription_stats()

        return DashboardMetrics(
            total_users=sum(role_counts.values()),
            total_students=role_counts.get(UserRole.STUDENT.value, 0),
            total_teachers=role_counts.get(UserRole.TEACHER.value, 0),
            total_admins=role_counts.get(UserRole.ADMIN.value, 0),
            users_by_status=status_counts,
            complaints_by_status=complaint_status_counts,
            total_allocations=total_allocations,
            total_countries=total_countries,
            signups_by_month=signups_by_month,
            recent_signups=recent_signups,
            avg_session_score_pct=avg_score_pct,
            score_trend_by_month=score_trend,
            top_teachers_by_score=top_teachers,
            attendance_both_joined_rate_pct=attendance_rate,
            attendance_trend_by_week=attendance_trend,
            subscriptions_by_status=subs_by_status,
            subscriptions_by_plan=subs_by_plan,
        )

    async def _counts_by(self, column) -> dict[str, int]:
        query = select(column, func.count()).group_by(column)
        result = await self.session.exec(query)
        return {
            (value.value if hasattr(value, "value") else value): count
            for value, count in result.all()
        }

    async def _signups_by_month(self, months: int = 6) -> list[SignupPoint]:
        month_expr = func.to_char(func.date_trunc("month", User.created_at), "YYYY-MM")
        query = (
            select(month_expr, func.count())
            .group_by(month_expr)
            .order_by(month_expr.desc())
            .limit(months)
        )
        result = await self.session.exec(query)
        points = [SignupPoint(month=month, count=count) for month, count in result.all()]
        return list(reversed(points))

    async def _recent_signups(self, limit: int = 10) -> list[RecentSignup]:
        query = select(User).order_by(User.created_at.desc()).limit(limit)
        result = await self.session.exec(query)
        return [
            RecentSignup(
                id=u.id,
                full_name=f"{u.first_name} {u.last_name}".strip(),
                email=u.email,
                role=u.role.value,
                created_at=u.created_at,
            )
            for u in result.all()
        ]

    async def _score_stats(
        self, months: int
    ) -> tuple[float | None, list[ScorePoint], list[TeacherScoreboardItem]]:
        """Platform-wide average score, a monthly trend, and a top-5 teacher
        leaderboard — all derived from SessionScore rows in the last
        `months` months. Returns (None, [], []) fields when there's no data
        yet rather than dividing by zero."""
        cutoff = datetime.utcnow() - timedelta(days=months * 31)

        overall_result = await self.session.exec(
            select(_SCORE_PCT).where(SessionScore.date >= cutoff)
        )
        avg_score_pct = overall_result.one()
        avg_score_pct = round(avg_score_pct, 1) if avg_score_pct is not None else None

        month_expr = func.to_char(func.date_trunc("month", SessionScore.date), "YYYY-MM")
        trend_query = (
            select(month_expr, _SCORE_PCT, func.count())
            .where(SessionScore.date >= cutoff)
            .group_by(month_expr)
            .order_by(month_expr.desc())
            .limit(months)
        )
        trend_result = await self.session.exec(trend_query)
        score_trend = [
            ScorePoint(month=month, avg_pct=round(avg_pct, 1), count=count)
            for month, avg_pct, count in trend_result.all()
        ]
        score_trend.reverse()

        leaderboard_query = (
            select(SessionScore.teacher_id, _SCORE_PCT, func.count())
            .where(SessionScore.date >= cutoff)
            .group_by(SessionScore.teacher_id)
            .order_by(_SCORE_PCT.desc())
            .limit(5)
        )
        leaderboard_result = await self.session.exec(leaderboard_query)
        top_teachers: list[TeacherScoreboardItem] = []
        for teacher_id, avg_pct, session_count in leaderboard_result.all():
            teacher = await self.session.get(User, teacher_id)
            teacher_name = (
                f"{teacher.first_name} {teacher.last_name}".strip() or teacher.email
                if teacher
                else "Unknown"
            )
            top_teachers.append(
                TeacherScoreboardItem(
                    teacher_id=teacher_id,
                    teacher_name=teacher_name,
                    avg_pct=round(avg_pct, 1),
                    session_count=session_count,
                )
            )

        return avg_score_pct, score_trend, top_teachers

    async def _attendance_stats(
        self, days: int = 30
    ) -> tuple[float | None, list[AttendancePoint]]:
        """Of the sessions that had at least one Join click in the last
        `days` days, what fraction had *both* sides join — plus the same
        rate broken down by week. Reuses SessionService's admin attendance
        grouping (app/features/sessions/service.py) instead of duplicating
        the (allocation, session_date) grouping logic here."""
        cutoff = date.today() - timedelta(days=days)
        records = await SessionService(self.session).get_admin_attendance()
        recent = [r for r in records if r.session_date >= cutoff]

        if not recent:
            return None, []

        both_joined = sum(1 for r in recent if r.student_joined_at and r.teacher_joined_at)
        rate = round(100.0 * both_joined / len(recent), 1)

        by_week: dict[date, list] = defaultdict(list)
        for r in recent:
            week_start = r.session_date - timedelta(days=r.session_date.weekday())
            by_week[week_start].append(r)

        trend = [
            AttendancePoint(
                week=week_start.isoformat(),
                rate_pct=round(
                    100.0 * sum(1 for r in items if r.student_joined_at and r.teacher_joined_at)
                    / len(items),
                    1,
                ),
            )
            for week_start, items in sorted(by_week.items())
        ]

        return rate, trend

    async def _subscription_stats(self) -> tuple[dict[str, int], dict[str, int]]:
        by_status = await self._counts_by(Subscription.status)
        by_plan = await self._counts_by(Subscription.plan_name)
        return by_status, by_plan
