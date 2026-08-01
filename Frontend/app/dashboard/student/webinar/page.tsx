'use client';

import { Video, CalendarClock } from 'lucide-react';
import { useLang } from '@/lib/dashboard/i18n';
import { useStudentStatus } from '@/lib/dashboard/StudentStatusContext';
import { EE } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Placeholder } from '@/components/dashboard/Placeholder';

const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function StudentWebinarPage() {
  const { t } = useLang();
  const { allocations } = useStudentStatus();

  const slots = allocations.flatMap((a) =>
    a.schedule.map((slot) => ({ ...slot, sessionsPerWeek: a.sessions_per_week, duration: a.duration }))
  );
  const sorted = [...slots].sort((a, b) => DAY_IDS.indexOf(a.day) - DAY_IDS.indexOf(b.day));

  return (
    <div>
      <SectionHeader title={t.webinarTitle} desc={t.webinarDesc} />

      <div style={{ marginBottom: 18 }}>
        <Placeholder text={t.webinarNote} />
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={CalendarClock} text={t.noSchedule} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((slot, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: `1px solid ${EE.border}`,
                borderRadius: EE.radiusMd,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontFamily: EE.fontHead, fontSize: 15, fontWeight: 600, color: EE.ink }}>
                  {t.days[slot.day]}
                </div>
                <div style={{ fontSize: 12.5, color: EE.sageMuted, marginTop: 2 }}>
                  {slot.time} · {slot.duration}min
                </div>
              </div>
              <button
                title={t.joinComingSoon}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: EE.emerald,
                  color: EE.parchment,
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  opacity: 0.85,
                }}
              >
                <Video size={15} />
                {t.joinBtn}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
