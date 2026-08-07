'use client';

import { useEffect, useState } from 'react';
import { Award, History, MessageSquare } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type AttendanceSummary, type SessionScore, type TeacherHistory } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { EE, scoreColor } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

export default function StudentProgressPage() {
  const { t } = useLang();
  const [scores, setScores] = useState<SessionScore[]>([]);
  const [history, setHistory] = useState<TeacherHistory[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get<SessionScore[]>('/users/me/session-scores'),
      apiClient.get<TeacherHistory[]>('/users/me/teacher-history'),
      apiClient.get<AttendanceSummary>('/sessions/attendance/summary').catch(() => ({ data: null })),
    ])
      .then(([scoresRes, historyRes, attendanceRes]) => {
        if (cancelled) return;
        setScores(scoresRes.data);
        setHistory(historyRes.data);
        setAttendance(attendanceRes.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionsWithTeacher = (teacherId: string): number | null =>
    attendance?.by_counterpart.find((c) => c.counterpart_id === teacherId)?.session_count ?? null;

  return (
    <div>
      <SectionHeader title={t.progressTitle} desc={t.progressDesc} />

      {loading ? (
        <p style={{ color: EE.sageMuted, fontSize: 14 }}>{t.loading}</p>
      ) : scores.length === 0 && history.length === 0 ? (
        <EmptyState icon={Award} text={t.noProgress} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="ee-progress-grid">
          <div>
            <h3 style={{ fontFamily: EE.fontHead, fontSize: 15.5, fontWeight: 600, color: EE.ink, marginBottom: 14 }}>
              {t.scoreTrend}
            </h3>
            {scores.length === 0 ? (
              <EmptyState icon={Award} text={t.noProgress} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scores.map((s) => {
                  const colors = scoreColor(s.score, s.max_score);
                  return (
                    <div
                      key={s.id}
                      style={{
                        background: '#fff',
                        border: `1px solid ${EE.border}`,
                        borderRadius: EE.radiusMd,
                        padding: '14px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12.5, color: EE.sageMuted }}>
                          {new Date(s.date).toLocaleDateString()}
                        </span>
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 20,
                            background: colors.bg,
                            color: colors.fg,
                          }}
                        >
                          {s.score}/{s.max_score}
                        </span>
                      </div>
                      {s.surah && (
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: EE.ink, marginBottom: 4 }}>{s.surah}</div>
                      )}
                      {s.teacher_comment && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: EE.sageMuted }}>
                          <MessageSquare size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                          <span>{s.teacher_comment}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontFamily: EE.fontHead, fontSize: 15.5, fontWeight: 600, color: EE.ink, marginBottom: 14 }}>
              {t.teacherHistory}
            </h3>
            {history.length === 0 ? (
              <EmptyState icon={History} text={t.noProgress} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      background: '#fff',
                      border: `1px solid ${EE.border}`,
                      borderRadius: EE.radiusMd,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: EE.ink }}>
                        {new Date(h.assigned_at).toLocaleDateString()}
                        {' – '}
                        {h.unassigned_at ? new Date(h.unassigned_at).toLocaleDateString() : t.current}
                      </div>
                      {h.reason && <div style={{ fontSize: 12.5, color: EE.sageMuted, marginTop: 2 }}>{h.reason}</div>}
                      {sessionsWithTeacher(h.teacher_id) != null && (
                        <div style={{ fontSize: 12, color: EE.goldDeep, marginTop: 2, fontWeight: 600 }}>
                          {sessionsWithTeacher(h.teacher_id)} {t.statSessionsAttended.toLowerCase()}
                        </div>
                      )}
                    </div>
                    {!h.unassigned_at && (
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: 'rgba(16,163,74,.12)',
                          color: '#0F7A3D',
                        }}
                      >
                        {t.current}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 800px) {
          .ee-progress-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
