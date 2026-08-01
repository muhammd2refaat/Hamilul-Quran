'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type TeacherStudent } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { EE, scoreColor } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

export default function TeacherStudentsPage() {
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

  return (
    <div>
      <SectionHeader title={t.studentsTitle} desc={t.studentsDesc} />

      {loading ? (
        <p style={{ color: EE.sageMuted, fontSize: 14 }}>{t.loading}</p>
      ) : students.length === 0 ? (
        <EmptyState icon={Users} text={t.noStudents} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {students.map((s) => {
            const hasScore = s.last_score != null && s.last_max_score;
            const colors = hasScore ? scoreColor(s.last_score!, s.last_max_score!) : null;
            return (
              <Link
                key={s.allocation_id}
                href={`/dashboard/teacher/students/${s.student_id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fff',
                  border: `1px solid ${EE.border}`,
                  borderRadius: EE.radiusMd,
                  padding: '16px 18px',
                  textDecoration: 'none',
                  color: 'inherit',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: `linear-gradient(160deg, ${EE.emeraldMid}, ${EE.emerald})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: EE.gold, fontWeight: 700, fontSize: 15 }}>
                      {s.first_name[0]}
                      {s.last_name[0]}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: EE.ink }}>
                      {s.first_name} {s.last_name}
                    </div>
                    <div style={{ fontSize: 12.5, color: EE.sageMuted }}>
                      {s.sessions_per_week}× / {t.statSessionsWeek.toLowerCase()} · {s.duration}min
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  {hasScore ? (
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        padding: '5px 12px',
                        borderRadius: 20,
                        background: colors!.bg,
                        color: colors!.fg,
                      }}
                    >
                      {s.last_score}/{s.last_max_score}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: EE.sageFaint, fontStyle: 'italic' }}>{t.noScoreYet}</span>
                  )}
                  <ChevronRight size={18} color={EE.sageFaint} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
