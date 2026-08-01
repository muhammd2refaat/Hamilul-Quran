'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, CalendarDays, Award, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type TeacherStudent } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { useDashboardUser } from '@/lib/dashboard/UserContext';
import { EE } from '@/lib/dashboard/theme';
import { ArchPanel } from '@/components/dashboard/ArchPanel';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/dashboard/EmptyState';

const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function TeacherOverviewPage() {
  const { t } = useLang();
  const user = useDashboardUser();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);

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

  const todayId = DAY_IDS[new Date().getDay()];
  const todaySlots = useMemo(() => {
    return students.flatMap((s) =>
      s.schedule
        .filter((slot) => slot.day === todayId)
        .map((slot) => ({ ...slot, studentName: `${s.first_name} ${s.last_name}`, studentId: s.student_id }))
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
            {todaySlots.map((slot, i) => (
              <Link
                key={i}
                href={`/dashboard/teacher/students/${slot.studentId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,.06)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  textDecoration: 'none',
                  color: EE.parchment,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>{slot.studentName}</span>
                <span style={{ fontSize: 13, color: EE.sage }}>{slot.time}</span>
              </Link>
            ))}
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
