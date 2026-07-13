'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, MessageSquare } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type TeacherStudent, type SessionScore } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { EE, scoreColor } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);
  const { t, dir } = useLang();

  const [student, setStudent] = useState<TeacherStudent | null>(null);
  const [scores, setScores] = useState<SessionScore[]>([]);
  const [loading, setLoading] = useState(true);

  const [score, setScore] = useState('17');
  const [maxScore, setMaxScore] = useState('20');
  const [surah, setSurah] = useState('');
  const [recitationType, setRecitationType] = useState('');
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const loadScores = async () => {
    const { data } = await apiClient.get<SessionScore[]>(
      `/teachers/me/students/${studentId}/session-scores`
    );
    setScores(data);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get<TeacherStudent[]>('/teachers/me/students'),
      apiClient.get<SessionScore[]>(`/teachers/me/students/${studentId}/session-scores`),
    ])
      .then(([studentsRes, scoresRes]) => {
        if (cancelled) return;
        const found = studentsRes.data.find((s) => s.student_id === studentId) ?? null;
        setStudent(found);
        setScores(scoresRes.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const handleRecord = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiClient.post('/session-scores', {
        student_id: studentId,
        score: Number(score),
        max_score: Number(maxScore),
        surah: surah || undefined,
        recitation_type: recitationType || undefined,
        teacher_comment: comment || undefined,
        notes: notes || undefined,
      });
      setSaveMsg(t.recordSaved);
      setSurah('');
      setRecitationType('');
      setComment('');
      setNotes('');
      await loadScores();
    } catch {
      setSaveMsg(t.recordFailed);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ color: EE.sageMuted, fontSize: 14 }}>{t.loading}</p>;
  }

  return (
    <div>
      <Link
        href="/dashboard/teacher/students"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: EE.sageMuted,
          textDecoration: 'none',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        <ArrowLeft size={14} style={dir === 'rtl' ? { transform: 'scaleX(-1)' } : undefined} />
        {t.back}
      </Link>

      <SectionHeader
        title={student ? `${student.first_name} ${student.last_name}` : ''}
        desc={student?.email}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="ee-student-grid">
        {/* Record session form */}
        <div style={{ background: '#fff', border: `1px solid ${EE.border}`, borderRadius: EE.radiusLg, padding: 24 }}>
          <h3 style={{ fontFamily: EE.fontHead, fontSize: 16, fontWeight: 600, color: EE.ink, marginBottom: 16 }}>
            {t.recordSession}
          </h3>

          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <FormField label={t.fieldScore}>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <FormField label={t.fieldMaxScore}>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                style={inputStyle}
              />
            </FormField>
          </div>

          <FormField label={t.fieldSurah}>
            <input value={surah} onChange={(e) => setSurah(e.target.value)} style={inputStyle} />
          </FormField>

          <FormField label={t.fieldRecitationType}>
            <input
              value={recitationType}
              onChange={(e) => setRecitationType(e.target.value)}
              style={inputStyle}
            />
          </FormField>

          <FormField label={t.fieldComment}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
          </FormField>

          <FormField label={t.fieldNotes}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
          </FormField>

          {saveMsg && (
            <p style={{ fontSize: 13, color: saveMsg === t.recordSaved ? '#0F7A3D' : '#B91C1C', marginBottom: 10 }}>
              {saveMsg}
            </p>
          )}

          <button
            onClick={handleRecord}
            disabled={saving}
            style={{
              width: '100%',
              background: EE.emerald,
              color: EE.parchment,
              border: 'none',
              padding: '13px',
              borderRadius: 10,
              fontSize: 14.5,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {t.save}
          </button>
        </div>

        {/* Session history */}
        <div>
          <h3 style={{ fontFamily: EE.fontHead, fontSize: 16, fontWeight: 600, color: EE.ink, marginBottom: 16 }}>
            {t.sessionHistory}
          </h3>

          {scores.length === 0 ? (
            <EmptyState icon={Award} text={t.noSessionHistory} />
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
      </div>

      <style>{`
        @media (max-width: 800px) {
          .ee-student-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, flex: 1 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: EE.sageMuted, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: `1px solid ${EE.border}`,
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#fff',
  color: EE.ink,
  outline: 'none',
};
