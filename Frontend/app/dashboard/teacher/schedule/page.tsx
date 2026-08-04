'use client';

import { useEffect, useState } from 'react';
import { Video, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type TeacherStudent } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { EE } from '@/lib/dashboard/theme';
import { getJoinWindowForWeeklySlot } from '@/lib/dashboard/calendarUtils';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Re-checked every 30s so a "Join" link flips live (from disabled to active,
// or vice versa) without the teacher having to reload the page.
const JOIN_WINDOW_RECHECK_MS = 30_000;

export default function TeacherSchedulePage() {
  const { t } = useLang();
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

  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), JOIN_WINDOW_RECHECK_MS);
    return () => clearInterval(id);
  }, []);

  const byDay = DAY_IDS.map((dayId) => ({
    dayId,
    label: t.days[dayId],
    slots: students
      .flatMap((s) =>
        s.schedule
          .filter((slot) => slot.day === dayId)
          .map((slot) => ({
            time: slot.time,
            studentName: `${s.first_name} ${s.last_name}`,
            meetLink: slot.meet_link,
            duration: s.duration,
          }))
      )
      .sort((a, b) => a.time.localeCompare(b.time)),
  }));

  const hasAnySlot = byDay.some((d) => d.slots.length > 0);

  return (
    <div>
      <SectionHeader title={t.scheduleTitle} desc={t.scheduleDesc} />

      {loading ? (
        <p style={{ color: EE.sageMuted, fontSize: 14 }}>{t.loading}</p>
      ) : !hasAnySlot ? (
        <EmptyState icon={Clock} text={t.noSchedule} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))',
            gap: 12,
            overflowX: 'auto',
          }}
        >
          {byDay.map((day) => (
            <div key={day.dayId}>
              <div
                style={{
                  textAlign: 'center',
                  padding: '10px 6px',
                  borderRadius: 10,
                  background: day.slots.length ? 'rgba(217,180,95,.14)' : '#fff',
                  border: `1px solid ${day.slots.length ? EE.goldDeep : EE.border}`,
                  color: day.slots.length ? EE.goldDeep : EE.sageFaint,
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 10,
                }}
              >
                {day.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {day.slots.map((slot, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff',
                      border: `1px solid ${EE.border}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: EE.ink, marginBottom: 2 }}>{slot.time}</div>
                    <div style={{ fontSize: 11.5, color: EE.sageMuted, marginBottom: 8 }}>{slot.studentName}</div>
                    {(() => {
                      const win = slot.meetLink
                        ? getJoinWindowForWeeklySlot(day.dayId, slot.time, slot.duration)
                        : null;
                      if (slot.meetLink && win?.isToday && win.state === 'joinable') {
                        return (
                          <a
                            href={slot.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              width: '100%',
                              justifyContent: 'center',
                              background: EE.emerald,
                              color: EE.parchment,
                              border: 'none',
                              borderRadius: 7,
                              padding: '6px 8px',
                              fontSize: 11.5,
                              fontWeight: 600,
                              fontFamily: 'inherit',
                              textDecoration: 'none',
                              boxSizing: 'border-box',
                            }}
                          >
                            <Video size={12} />
                            {t.joinBtn}
                          </a>
                        );
                      }
                      const tooltip = !slot.meetLink
                        ? t.joinComingSoon
                        : win?.isToday && win.state === 'ended'
                        ? t.joinEnded
                        : t.joinOpensSoon;
                      return (
                        <button
                          disabled
                          title={tooltip}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            width: '100%',
                            justifyContent: 'center',
                            background: EE.emerald,
                            color: EE.parchment,
                            border: 'none',
                            borderRadius: 7,
                            padding: '6px 8px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            cursor: 'not-allowed',
                            opacity: 0.55,
                          }}
                        >
                          <Video size={12} />
                          {t.joinBtn}
                        </button>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
