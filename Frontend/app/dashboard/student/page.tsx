'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, CalendarClock, Award, ClipboardList } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type AttendanceSummary } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { useDashboardUser } from '@/lib/dashboard/UserContext';
import { useStudentStatus } from '@/lib/dashboard/StudentStatusContext';
import { EE } from '@/lib/dashboard/theme';
import { ArchPanel } from '@/components/dashboard/ArchPanel';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { PlanRequestModal } from '@/components/dashboard/PlanRequestModal';

export default function StudentOverviewPage() {
  const { t } = useLang();
  const user = useDashboardUser();
  const { isNew, allocations } = useStudentStatus();
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialSent, setTrialSent] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    if (isNew) return;
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
  }, [isNew]);

  return (
    <div>
      <SectionHeader title={`${t.welcomeBack}, ${user.first_name}`} desc={t.studentWelcomeDesc} />

      {isNew ? (
        <ArchPanel>
          <div
            style={{
              fontFamily: EE.fontHead,
              fontSize: 15,
              letterSpacing: '1px',
              color: EE.gold,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {t.newStudentTitle}
          </div>
          <p style={{ fontSize: 14.5, color: EE.sageLight, maxWidth: 460, lineHeight: 1.6, margin: '0 0 18px' }}>
            {t.newStudentDesc}
          </p>
          {trialSent ? (
            <p style={{ fontSize: 14, color: EE.gold, fontWeight: 600, margin: 0 }}>{t.trialRequested}</p>
          ) : (
            <button
              onClick={() => setTrialOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: EE.gold,
                color: EE.emerald,
                border: 'none',
                padding: '13px 26px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14.5,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={16} />
              {t.requestTrialBtn}
            </button>
          )}
        </ArchPanel>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          <StatCard label={t.statSessionsWeek} value={allocations[0]?.sessions_per_week ?? '—'} icon={CalendarClock} />
          <StatCard label={t.currentPlanSnapshot} value={`${allocations[0]?.duration ?? '—'}min`} icon={ClipboardList} />
          <StatCard label={t.statSessionsAttended} value={attendance?.total_sessions ?? '—'} icon={Award} />
        </div>
      )}

      {!isNew && (
        <div style={{ marginTop: 26 }}>
          <Link
            href="/dashboard/student/progress"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: EE.emerald,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            {t.navProgress} →
          </Link>
        </div>
      )}

      <PlanRequestModal
        open={trialOpen}
        onClose={() => setTrialOpen(false)}
        onSuccess={() => setTrialSent(true)}
        title={t.requestTrialBtn}
        description={t.newStudentDesc}
      />
    </div>
  );
}
