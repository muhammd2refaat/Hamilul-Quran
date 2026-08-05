'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { EE } from '@/lib/dashboard/theme';
import { useLang } from '@/lib/dashboard/i18n';
import { apiClient } from '@/lib/api';
import { type TeacherOption } from '@/types/dashboard';

export type RequestKind = 'new_enrollment' | 'change_teacher' | 'pause' | 'other';

interface RequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  requestType: RequestKind;
  title: string;
  description?: string;
  /** Show a "preferred teacher" text field (used for change_teacher). */
  showRequestedTeacher?: boolean;
  /** Show a "requested plan" text field (used for new_enrollment / plan changes). */
  showRequestedPlan?: boolean;
  detailsLabel: string;
  detailsPlaceholder?: string;
}

export function RequestModal({
  open,
  onClose,
  onSuccess,
  requestType,
  title,
  description,
  showRequestedTeacher,
  showRequestedPlan,
  detailsLabel,
  detailsPlaceholder,
}: RequestModalProps) {
  const { t, dir } = useLang();
  const [details, setDetails] = useState('');
  const [requestedTeacher, setRequestedTeacher] = useState('');
  const [requestedPlan, setRequestedPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  useEffect(() => {
    if (!open || !showRequestedTeacher) return;
    let cancelled = false;
    async function loadTeachers() {
      setTeachersLoading(true);
      try {
        const { data } = await apiClient.get<{ items: TeacherOption[] }>('/teachers', {
          params: { limit: 100 },
        });
        if (!cancelled) setTeachers(data.items);
      } catch {
        if (!cancelled) setTeachers([]);
      } finally {
        if (!cancelled) setTeachersLoading(false);
      }
    }
    loadTeachers();
    return () => {
      cancelled = true;
    };
  }, [open, showRequestedTeacher]);

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/requests', {
        type: requestType,
        details: details || title,
        requested_teacher: showRequestedTeacher && requestedTeacher ? requestedTeacher : undefined,
        requested_plan: showRequestedPlan && requestedPlan ? requestedPlan : undefined,
      });
      setDetails('');
      setRequestedTeacher('');
      setRequestedPlan('');
      onSuccess?.();
      onClose();
    } catch {
      setError(t.recordFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(8,30,22,.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          background: EE.parchment,
          borderRadius: 18,
          padding: 30,
          position: 'relative',
          boxShadow: '0 30px 60px rgba(8,30,22,.4)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="close"
          style={{
            position: 'absolute',
            top: 14,
            insetInlineEnd: 16,
            background: 'transparent',
            border: 'none',
            fontSize: 20,
            color: EE.sageFaint,
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontFamily: EE.fontHead, fontSize: 19, fontWeight: 600, color: EE.ink, margin: '0 0 6px' }}>
          {title}
        </h2>
        {description && <p style={{ fontSize: 13, color: EE.sageMuted, marginBottom: 18 }}>{description}</p>}

        {showRequestedTeacher && (
          <FormField label={t.requestedTeacher}>
            <select
              value={requestedTeacher}
              onChange={(e) => setRequestedTeacher(e.target.value)}
              disabled={teachersLoading}
              style={inputStyle}
            >
              <option value="">
                {teachersLoading ? t.loadingTeachers : t.noPreference}
              </option>
              {teachers.map((teacher) => (
                <option key={teacher.user_id} value={teacher.full_name}>
                  {teacher.full_name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {showRequestedPlan && (
          <FormField label={t.fieldPlan}>
            <input value={requestedPlan} onChange={(e) => setRequestedPlan(e.target.value)} style={inputStyle} />
          </FormField>
        )}

        <FormField label={detailsLabel}>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={detailsPlaceholder}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
        </FormField>

        {error && <p style={{ color: '#B91C1C', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              border: `1px solid ${EE.border}`,
              color: EE.sageMuted,
              padding: '12px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1,
              background: EE.emerald,
              color: EE.parchment,
              border: 'none',
              padding: '12px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {t.submit}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: EE.sageMuted, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  border: `1px solid ${EE.border}`,
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#fff',
  color: EE.ink,
  outline: 'none',
};
