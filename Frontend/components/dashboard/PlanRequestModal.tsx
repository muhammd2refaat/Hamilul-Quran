'use client';

import { useEffect, useState } from 'react';
import { X, CalendarCheck, Layers } from 'lucide-react';
import { EE } from '@/lib/dashboard/theme';
import { useLang } from '@/lib/dashboard/i18n';
import { apiClient } from '@/lib/api';
import { getPlanDisplayName } from '@/lib/dashboard/planDisplay';
import { type TeacherOption, type ScheduleSlot, type PlatformRequest, type Plan } from '@/types/dashboard';

const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
// Full 24-hour range in the "HH:MM AM/PM" format the backend expects
// (parse_time_str, google_calendar_client.py) — mirrors Admin-CMS's
// AllocationsPage so students can request any hour, not just 8 AM-8 PM.
const TIME_SLOTS = Array.from({ length: 24 }, (_, hour) => {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, '0')}:00 ${period}`;
});

interface PlanRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title: string;
  description?: string;
  /** Editing an existing pending/in_review request instead of filing a new
   * one — pre-fills the picker from its stored values and PATCHes
   * /requests/{id} on save instead of POSTing a new request. */
  editRequest?: PlatformRequest;
  /**
   * 'trial' (a brand-new student's free trial): locked to exactly one
   * 30-minute session — no plan catalog, no price, just a single time-slot
   * pick from the same full day/time grid. 'change' (default, an existing
   * student changing/upgrading their plan): the real plan catalog, plus a
   * "Custom" option for a request that doesn't match any of them.
   */
  mode?: 'trial' | 'change';
}

/**
 * Mirrors Admin-CMS's allocation-creation picker (sessions/week, duration,
 * day/time-slot grid) so a student can propose the same structured plan an
 * admin would otherwise build for them — everything mandatory except the
 * preferred teacher, which defaults to "no preference, admin decides."
 *
 * Submits through POST /requests (type: new_enrollment) for a new request,
 * or PATCH /requests/{id} when editing an existing one — the backend
 * rejects the edit once an admin has already approved/rejected it. The
 * structured picks are stored as real fields (requested_sessions_per_week/
 * requested_duration/requested_schedule) so an edit can reliably re-open
 * with the previous selections, and also formatted into
 * requested_plan/details for Admin-CMS's Requests page, which still
 * displays those as its summary chips. An admin still manually creates the
 * real allocation once they've reviewed/approved the request.
 */
export function PlanRequestModal({
  open,
  onClose,
  onSuccess,
  title,
  description,
  editRequest,
  mode = 'change',
}: PlanRequestModalProps) {
  const isTrial = mode === 'trial';
  const { t, lang, dir } = useLang();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  // 'change' mode only: a request that doesn't match any real catalog plan
  // — reveals the free sessions/duration pickers below the plan cards.
  const [customMode, setCustomMode] = useState(false);
  const [customSessions, setCustomSessions] = useState(2);
  const [customDuration, setCustomDuration] = useState<30 | 45 | 60>(30);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [preferredTeacher, setPreferredTeacher] = useState('');
  const [notes, setNotes] = useState('');
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  // The schedule-slot grid needs a target count/duration even before a plan
  // has loaded/been picked — fall back to sane defaults so it doesn't crash.
  const sessionsPerWeek = isTrial ? 1 : customMode ? customSessions : (selectedPlan?.sessions_per_week ?? 1);
  const duration = isTrial ? 30 : customMode ? customDuration : (selectedPlan?.session_duration_minutes ?? 30);

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

  useEffect(() => {
    if (!open || isTrial) return; // trial mode never shows the catalog — no need to fetch it
    let cancelled = false;
    async function loadPlans() {
      setPlansLoading(true);
      try {
        const { data } = await apiClient.get<Plan[]>('/plans', { params: { include_inactive: false } });
        if (!cancelled) setPlans(data);
      } catch {
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    }
    loadPlans();
    return () => {
      cancelled = true;
    };
  }, [open, isTrial]);

  // Pre-fill from the request being edited (or reset to defaults for a new
  // request) each time the modal opens for a *different* target — adjusted
  // during render rather than in an effect, per React's own guidance for
  // "resetting state when a prop changes" (avoids an extra render pass and
  // the lint rule against synchronous setState in effects). `openKey` is
  // null while closed so re-opening the same request still triggers a
  // fresh pre-fill instead of keeping stale in-progress edits.
  const openKey = open ? (editRequest?.id ?? '__create__') : null;
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (open && openKey !== prefilledFor) {
    setPrefilledFor(openKey);
    // requested_plan_id is only present on requests filed since this plan
    // picker existed — older requests being edited fall back to matching an
    // active plan by shape (sessions/duration); if even that fails, treat it
    // as a custom request rather than guessing wrong. Trial mode never has
    // any of this — sessions/duration are always locked, nothing to pre-fill.
    if (!isTrial) {
      if (editRequest?.requested_plan_id) {
        setSelectedPlanId(editRequest.requested_plan_id);
        setCustomMode(false);
      } else if (editRequest?.requested_sessions_per_week && editRequest?.requested_duration) {
        const match = plans.find(
          (p) =>
            p.sessions_per_week === editRequest.requested_sessions_per_week &&
            p.session_duration_minutes === editRequest.requested_duration
        );
        if (match) {
          setSelectedPlanId(match.id);
          setCustomMode(false);
        } else {
          setSelectedPlanId('');
          setCustomMode(true);
          setCustomSessions(editRequest.requested_sessions_per_week);
          setCustomDuration(editRequest.requested_duration as 30 | 45 | 60);
        }
      } else {
        setSelectedPlanId('');
        setCustomMode(false);
      }
    }
    setSchedule(editRequest?.requested_schedule ?? []);
    setPreferredTeacher(editRequest?.requested_teacher ?? '');
    // The free-text note isn't stored as its own field — it's folded into
    // `details` for admin readability, so it isn't reliably recoverable
    // here. Left blank on edit; re-typing it is a small ask.
    setNotes('');
    setError(null);
  }

  if (!open) return null;

  function selectPlan(planId: string) {
    setSelectedPlanId(planId);
    setCustomMode(false);
    setSchedule([]); // slot count must match the new plan's sessions/week — reset like Admin's own picker does
  }

  function selectCustom() {
    setSelectedPlanId('');
    setCustomMode(true);
    setSchedule([]);
  }

  function toggleSlot(day: string, time: string) {
    const idx = schedule.findIndex((s) => s.day === day && s.time === time);
    if (idx >= 0) {
      setSchedule(schedule.filter((_, i) => i !== idx));
    } else if (isTrial) {
      // Trial is locked to a single session — picking a new slot swaps the
      // previous pick instead of requiring it to be deselected first.
      setSchedule([{ day, time }]);
    } else if (schedule.length < sessionsPerWeek) {
      setSchedule([...schedule, { day, time }]);
    }
  }

  const isValid = isTrial
    ? schedule.length === 1
    : (!!selectedPlanId || customMode) && schedule.length === sessionsPerWeek;

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

      // English, regardless of the site's current language — this is the
      // summary Admin-CMS shows, a separate (English-first) app from this
      // one. requested_plan_id is the source of truth for a real plan
      // either way; this string is just a readable fallback for trial/
      // custom requests, which have no catalog row to point to.
      const requestedPlanSummary = isTrial
        ? 'Free trial — 1 session / 30 min'
        : selectedPlan
          ? selectedPlan.name
          : `${sessionsPerWeek}×/week, ${duration} min (custom)`;

      const payload = {
        details,
        requested_plan: requestedPlanSummary,
        requested_plan_id: !isTrial ? selectedPlan?.id : undefined,
        requested_teacher: preferredTeacher || undefined,
        requested_sessions_per_week: sessionsPerWeek,
        requested_duration: duration,
        requested_schedule: schedule,
      };

      if (editRequest) {
        await apiClient.patch(`/requests/${editRequest.id}`, payload);
      } else {
        await apiClient.post('/requests', { type: 'new_enrollment', ...payload });
      }

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

        {/* Plan — skipped entirely for a trial: always exactly one 30-minute
            session, no catalog, no price. */}
        {!isTrial && (
          <>
            <SectionLabel icon={Layers} title={t.choosePlanLabel} desc={t.choosePlanDesc} />
            {plansLoading ? (
              <p style={{ fontSize: 13, color: EE.sageMuted, marginBottom: 22 }}>{t.loadingTeachers}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: customMode ? 14 : 22 }}>
                {plans.length === 0 && (
                  <p style={{ fontSize: 13, color: EE.sageMuted }}>{t.noPlansAvailable}</p>
                )}
                {plans.map((plan) => {
                  const active = !customMode && plan.id === selectedPlanId;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => selectPlan(plan.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `2px solid ${active ? EE.emerald : EE.border}`,
                        background: active ? 'rgba(15,122,61,.08)' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'start' as const,
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: EE.ink }}>
                        {getPlanDisplayName(plan, lang)}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: active ? EE.emerald : EE.goldDeep, flexShrink: 0 }}>
                        {plan.price} {plan.currency}
                      </span>
                    </button>
                  );
                })}
                {/* Not one of the priced plans — a fully custom request an
                    admin reviews and follows up on manually. */}
                <button
                  type="button"
                  onClick={selectCustom}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `2px dashed ${customMode ? EE.emerald : EE.border}`,
                    background: customMode ? 'rgba(15,122,61,.08)' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'start' as const,
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: EE.ink }}>{t.customPlanLabel}</span>
                </button>
              </div>
            )}

            {customMode && (
              <div style={{ marginBottom: 22, paddingLeft: 4 }}>
                <FormField label={t.sessionsPerWeekLabel}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setCustomSessions(n);
                          setSchedule([]);
                        }}
                        style={smallPillStyle(customSessions === n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </FormField>
                <FormField label={t.durationLabel}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([30, 45, 60] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCustomDuration(mins)}
                        style={{ ...smallPillStyle(customDuration === mins), padding: '8px 14px', width: 'auto' }}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
            )}
          </>
        )}

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
            {editRequest ? t.saveChangesBtn : t.submit}
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

function smallPillStyle(active: boolean): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    border: `2px solid ${active ? EE.emerald : EE.border}`,
    background: active ? EE.emerald : '#fff',
    color: active ? EE.parchment : EE.sageMuted,
    cursor: 'pointer',
  };
}

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
