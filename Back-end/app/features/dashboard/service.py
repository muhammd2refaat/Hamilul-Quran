from sqlalchemy import func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.features.allocations.models import Allocation
from app.features.complaints.models import Complaint
from app.features.dashboard.schemas import DashboardMetrics, RecentSignup, SignupPoint
from app.features.users.models import User, UserRole


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_metrics(self) -> DashboardMetrics:
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

        signups_by_month = await self._signups_by_month()
        recent_signups = await self._recent_signups()

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
