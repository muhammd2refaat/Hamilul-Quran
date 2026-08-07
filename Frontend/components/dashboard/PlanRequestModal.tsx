'use client';

import { useEffect, useState } from 'react';
import { X, CalendarDays, Clock, CalendarCheck } from 'lucide-react';
import { EE } from '@/lib/dashboard/theme';
import { useLang } from '@/lib/dashboard/i18n';
import { apiClient } from '@/lib/api';
import { type TeacherOption, type ScheduleSlot } from '@/types/dashboard';

const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SESSIONS_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;
const DURATION_OPTIONS = [30, 45, 60] as const;
const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM',
];

interface PlanRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title: string;
  description?: string;
}

/**
 * Mirrors Admin-CMS's allocation-creation picker (sessions/week, duration,
 * day/time-slot grid) so a student can propose the same structured plan an
 * admin would otherwise build for them — everything mandatory except the
 * preferred teacher, which defaults to "no preference, admin decides."
 *
 * Submits through the existing POST /requests (type: new_enrollment) — no
 * backend schema change needed, the structured picks are formatted into
 * requested_plan/details/requested_teacher, which Admin-CMS's Requests page
 * already renders as summary chips for that type. An admin still manually
 * creates the real allocation once they've reviewed/approved the request.
 */
export function PlanRequestModal({ open, onClose, onSuccess, title, description }: PlanRequestModalProps) {
  const { t, dir } = useLang();
  const [sessionsPerWeek, setSessionsPerWeek] = useState(2);
  const [duration, setDuration] = useState<30 | 45 | 60>(30);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [preferredTeacher, setPreferredTeacher] = useState('');
  const [notes, setNotes] = useState('');
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  if (!open) return null;

  function chooseSessionsPerWeek(n: number) {
    setSessionsPerWeek(n);
    setSchedule([]); // slot count must match — reset like Admin's own picker does
  }

  function toggleSlot(day: string, time: string) {
    const idx = schedule.findIndex((s) => s.day === day && s.time === time);
    if (idx >= 0) {
      setSchedule(schedule.filter((_, i) => i !== idx));
    } else if (schedule.length < sessionsPerWeek) {
      setSchedule([...schedule, { day, time }]);
    }
  }

  const isValid = schedule.length === sessionsPerWeek;

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const slotsText = schedule
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((s) => `${t.days[s.day]} ${s.time}`)
        .join(', ');
      const details =
        `${t.sessionsPerWeekLabel}: ${sessionsPerWeek}\n` +
        `${t.durationLabel}: ${duration} min\n` +
        `${t.timeSlotsLabel}: ${slotsText}` +
        (notes.trim() ? `\n\n${t.additionalNotesLabel}: ${notes.trim()}` : '');

      await apiClient.post('/requests', {
        type: 'new_enrollment',
        details,
        requested_plan: `${sessionsPerWeek}×/week, ${duration} min`,
        requested_teacher: preferredTeacher || undefined,
      });

      setSessionsPerWeek(2);
      setDuration(30);
      setSchedule([]);
      setPreferredTeacher('');
      setNotes('');
      onSuccess?.();
      onClose();
    } catch {
      setError(t.planRequestFailed);
    } finally {
      setSubmitting(false);
    }
  }

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
          maxWidth: 620,
          maxHeight: '88vh',
          overflowY: 'auto',
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
        {description && <p style={{ fontSize: 13, color: EE.sageMuted, marginBottom: 22 }}>{description}</p>}

        {/* Sessions per week */}
        <SectionLabel icon={CalendarDays} title={t.sessionsPerWeekLabel} desc={t.sessionsPerWeekDesc} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          {SESSIONS_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => chooseSessionsPerWeek(n)}
              style={pillStyle(sessionsPerWeek === n)}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Duration */}
        <SectionLabel icon={Clock} title={t.durationLabel} desc={t.durationDesc} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          {DURATION_OPTIONS.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setDuration(mins)}
              style={pillStyle(duration === mins, true)}
            >
              {mins} min
            </button>
          ))}
        </div>

        {/* Time slots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionLabel icon={CalendarCheck} title={t.timeSlotsLabel} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: isValid ? EE.emerald : EE.goldDeep }}>
            {schedule.length}/{sessionsPerWeek} {t.slotsSelectedSuffix}
          </span>
        </div>
        <div style={{ overflowX: 'auto', marginBottom: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(84px, 1fr))', gap: 8, minWidth: 620 }}>
            {DAY_IDS.map((day) => {
              const daySelected = schedule.filter((s) => s.day === day).length;
              return (
                <div key={day}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '8px 4px',
                      borderRadius: 8,
                      background: daySelected ? 'rgba(217,180,95,.16)' : '#fff',
                      border: `1px solid ${daySelected ? EE.goldDeep : EE.border}`,
                      color: daySelected ? EE.goldDeep : EE.sageFaint,
                      fontWeight: 700,
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                  >
                    {t.days[day].slice(0, 3)}
                    {daySelected > 0 && <span style={{ marginInlineStart: 4 }}>· {daySelected}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {TIME_SLOTS.map((time) => {
                      const selected = schedule.some((s) => s.day === day && s.time === time);
                      const disabled = !selected && schedule.length >= sessionsPerWeek;
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleSlot(day, time)}
                          style={{
                            fontSize: 10.5,
                            padding: '6px 2px',
                            borderRadius: 6,
                            border: `1px solid ${selected ? EE.emerald : EE.border}`,
                            background: selected ? EE.emerald : disabled ? '#F5F3EC' : '#fff',
                            color: selected ? EE.parchment : disabled ? EE.sageFaint : EE.ink,
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.55 : 1,
                          }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preferred teacher — optional */}
        <FormField label={t.requestedTeacher}>
          <select
            value={preferredTeacher}
            onChange={(e) => setPreferredTeacher(e.target.value)}
            disabled={teachersLoading}
            style={inputStyle}
          >
            <option value="">{teachersLoading ? t.loadingTeachers : t.noPreference}</option>
            {teachers.map((teacher) => (
              <option key={teacher.user_id} value={teacher.full_name}>
                {teacher.full_name}
              </option>
            ))}
          </select>
        </FormField>

        {/* Additional notes — optional */}
        <FormField label={t.additionalNotesLabel}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
        </FormField>

        {error && <p style={{ color: '#B91C1C', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            style={{
              ...primaryBtnStyle,
              cursor: submitting || !isValid ? 'default' : 'pointer',
              opacity: submitting || !isValid ? 0.5 : 1,
            }}
          >
            {t.submit}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  desc?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: EE.ink }}>
        <Icon size={15} color={EE.goldDeep} />
        {title}
      </div>
      {desc && <p style={{ fontSize: 12, color: EE.sageMuted, margin: '3px 0 0' }}>{desc}</p>}
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

function pillStyle(active: boolean, wide = false): React.CSSProperties {
  return {
    width: wide ? undefined : 40,
    padding: wide ? '10px 16px' : undefined,
    height: wide ? undefined : 40,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
    border: `2px solid ${active ? EE.emerald : EE.border}`,
    background: active ? EE.emerald : '#fff',
    color: active ? EE.parchment : EE.sageMuted,
    cursor: 'pointer',
    transition: 'all .15s',
  };
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

const secondaryBtnStyle: React.CSSProperties = {
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
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  background: EE.emerald,
  color: EE.parchment,
  border: 'none',
  padding: '12px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
};
