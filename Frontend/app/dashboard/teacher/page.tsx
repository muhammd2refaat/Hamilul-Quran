'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, CalendarDays, Award, Clock, Video } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type AttendanceSummary, type TeacherStudent } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { useDashboardUser } from '@/lib/dashboard/UserContext';
import { EE } from '@/lib/dashboard/theme';
import { getJoinWindowForWeeklySlot, cairoTodayISO } from '@/lib/dashboard/calendarUtils';
import { recordAttendance } from '@/lib/dashboard/attendance';
import { ArchPanel } from '@/components/dashboard/ArchPanel';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/dashboard/EmptyState';

const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Re-checked every 30s so a "Join" link flips live (from disabled to active,
// or vice versa) without the teacher having to reload the page.
const JOIN_WINDOW_RECHECK_MS = 30_000;

export default function TeacherOverviewPage() {
  const { t } = useLang();
  const user = useDashboardUser();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<TeacherStudent[]>('/teachers/me/students')
      .then(({ data }) => {
        if (!cancelled) setStudents(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<AttendanceSummary>('/sessions/attendance/summary')
      .then(({ data }) => {
        if (!cancelled) setAttendance(data);
      })
      .catch(() => {
        // Non-critical stat — leave the card showing "—" on failure.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), JOIN_WINDOW_RECHECK_MS);
    return () => clearInterval(id);
  }, []);

  const todayId = DAY_IDS[new Date().getDay()];
  const todaySlots = useMemo(() => {
    return students.flatMap((s) =>
      s.schedule
        .filter((slot) => slot.day === todayId)
        .map((slot) => ({
          ...slot,
          allocationId: s.allocation_id,
          studentName: `${s.first_name} ${s.last_name}`,
          studentId: s.student_id,
          duration: s.duration,
        }))
    );
  }, [students, todayId]);

  const totalSessionsPerWeek = students.reduce((sum, s) => sum + s.sessions_per_week, 0);
  const scoresWithValues = students.filter((s) => s.last_score != null && s.last_max_score);
  const avgScorePct = scoresWithValues.length
    ? Math.round(
        (scoresWithValues.reduce((sum, s) => sum + (s.last_score! / s.last_max_score!) * 100, 0) /
          scoresWithValues.length)
      )
    : null;

  return (
    <div>
      <SectionHeader title={`${t.welcomeBack}, ${user.first_name}`} desc={t.teacherWelcomeDesc} />

      <ArchPanel>
        <div style={{ fontFamily: EE.fontHead, fontSize: 15, letterSpacing: '1px', color: EE.gold, textTransform: 'uppercase', marginBottom: 6 }}>
          {t.todaySessions}
        </div>
        {todaySlots.length === 0 ? (
          <p style={{ fontSize: 14, color: EE.sageLight, margin: 0 }}>{t.noSessionsToday}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {todaySlots.map((slot, i) => {
              const win = slot.meet_link
                ? getJoinWindowForWeeklySlot(todayId, slot.time, slot.duration)
                : null;
              const joinable = Boolean(slot.meet_link && win?.isToday && win.state === 'joinable');
              const tooltip = !slot.meet_link
                ? t.joinComingSoon
                : win?.isToday && win.state === 'ended'
                ? t.joinEnded
                : t.joinOpensSoon;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'rgba(255,255,255,.06)',
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}
                >
                  <Link
                    href={`/dashboard/teacher/students/${slot.studentId}`}
                    style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: EE.parchment, minWidth: 0 }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{slot.studentName}</span>
                    <span style={{ fontSize: 13, color: EE.sage }}>{slot.time}</span>
                  </Link>
                  {joinable ? (
                    <a
                      href={slot.meet_link!}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => recordAttendance(slot.allocationId, cairoTodayISO(), todayId, slot.time)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: EE.gold,
                        color: '#10241C',
                        borderRadius: 8,
                        padding: '7px 12px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        textDecoration: 'none',
                        flexShrink: 0,
                      }}
                    >
                      <Video size={13} />
                      {t.joinBtn}
                    </a>
                  ) : (
                    <span
                      title={tooltip}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: EE.sage,
                        border: '1px solid rgba(255,255,255,.18)',
                        borderRadius: 8,
                        padding: '7px 12px',
                        fontSize: 12.5,
                        fontWeight: 600,
                        opacity: 0.6,
                        flexShrink: 0,
                      }}
                    >
                      <Video size={13} />
                      {t.joinBtn}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ArchPanel>

      <div style={{ marginTop: 26 }}>
        <h2 style={{ fontFamily: EE.fontHead, fontSize: 16, fontWeight: 600, color: EE.ink, marginBottom: 14 }}>
          {t.quickStats}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          <StatCard label={t.statStudents} value={students.length} icon={Users} />
          <StatCard label={t.statSessionsWeek} value={totalSessionsPerWeek} icon={CalendarDays} />
          <StatCard label={t.statAvgScore} value={avgScorePct != null ? `${avgScorePct}%` : '—'} icon={Award} />
          <StatCard label={t.statSessionsAttended} value={attendance?.total_sessions ?? '—'} icon={Video} />
        </div>
      </div>

      {!loading && students.length === 0 && (
        <div style={{ marginTop: 26 }}>
          <EmptyState icon={Clock} text={t.noStudents} />
        </div>
      )}
    </div>
  );
}
