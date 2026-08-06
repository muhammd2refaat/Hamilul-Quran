'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Video, GraduationCap } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type CalendarEvent } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { EE } from '@/lib/dashboard/theme';
import { groupEventsByDate, formatEventDate, getJoinWindowForDate } from '@/lib/dashboard/calendarUtils';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

// Re-checked every 30s so a "Join" link flips live (from disabled to active,
// or vice versa) without the teacher having to reload the page.
const JOIN_WINDOW_RECHECK_MS = 30_000;

export default function TeacherCalendarPage() {
  const { t, lang } = useLang();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<CalendarEvent[]>('/calendar/me?weeks=4')
      .then(({ data }) => {
        if (!cancelled) setEvents(data);
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

  const grouped = groupEventsByDate(events);

  return (
    <div>
      <SectionHeader title={t.calendarTitle} desc={t.calendarDesc} />

      {loading ? (
        <p style={{ color: EE.sageMuted, fontSize: 14 }}>{t.loading}</p>
      ) : grouped.length === 0 ? (
        <EmptyState icon={CalendarDays} text={t.noUpcoming} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(([date, dayEvents]) => (
            <div key={date}>
              <h3
                style={{
                  fontFamily: EE.fontHead,
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: EE.ink,
                  marginBottom: 10,
                }}
              >
                {formatEventDate(date, t.days[dayEvents[0].day], lang)}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      background: '#fff',
                      border: `1px solid ${EE.border}`,
                      borderRadius: EE.radiusMd,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 700,
                          color: EE.ink,
                          background: 'rgba(217,180,95,.12)',
                          padding: '4px 10px',
                          borderRadius: 20,
                        }}
                      >
                        <Clock size={13} color={EE.goldDeep} />
                        {e.time}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: EE.ink, fontWeight: 600 }}>
                        <GraduationCap size={14} color={EE.emerald} />
                        {e.student_name}
                      </span>
                      <span style={{ fontSize: 12, color: EE.sageMuted }}>{e.duration} min</span>
                    </div>

                    {(() => {
                      const win = e.meet_link ? getJoinWindowForDate(e.date, e.time, e.duration) : null;
                      if (e.meet_link && win?.state === 'joinable') {
                        return (
                          <a
                            href={e.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: EE.emerald,
                              color: EE.parchment,
                              border: 'none',
                              borderRadius: 8,
                              padding: '8px 14px',
                              fontSize: 12.5,
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <Video size={13} />
                            {t.joinBtn}
                          </a>
                        );
                      }
                      const tooltip = !e.meet_link
                        ? t.joinComingSoon
                        : win?.state === 'ended'
                        ? t.joinEnded
                        : t.joinOpensSoon;
                      return (
                        <span
                          title={tooltip}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: EE.parchment,
                            color: EE.sageFaint,
                            border: `1px solid ${EE.border}`,
                            borderRadius: 8,
                            padding: '8px 14px',
                            fontSize: 12.5,
                            fontWeight: 600,
                          }}
                        >
                          <Video size={13} />
                          {t.joinBtn}
                        </span>
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
