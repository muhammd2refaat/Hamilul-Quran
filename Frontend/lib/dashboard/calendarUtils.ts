import type { CalendarEvent } from '@/types/dashboard';

export function groupEventsByDate(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Format an ISO "YYYY-MM-DD" date as "<dayLabel>, <Mon D>" without any date library. */
export function formatEventDate(dateStr: string, dayLabel: string, lang: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const monthDay = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
  return `${dayLabel}, ${monthDay}`;
}

// ─── Join-window gating ────────────────────────────────────────────────────────
// The "Join session" link should only be live shortly before/during the
// actual lesson, not for the full 4-week window the calendar projects — see
// Back-end's Cairo-local scheduling (schedule times are always Africa/Cairo,
// regardless of the viewer's own timezone/locale).
const CAIRO_TZ = 'Africa/Cairo';
const JOIN_OPENS_MINUTES_BEFORE = 15;

const DAY_TO_INDEX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/**
 * A Date object whose UTC getters (getUTCFullYear/getUTCDay/etc.) reflect
 * Cairo *wall-clock* time — not a real UTC instant. Safe to compare or
 * subtract against another value built the same way (both live in the same
 * synthetic frame), which sidesteps needing real DST-offset math in the
 * browser: schedule times are entered/stored as plain Cairo local time, so
 * comparing two "Cairo wall clock" values directly is exactly correct.
 */
function cairoNow(reference: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(reference);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));
}

/** Parse a "10:00 AM" style string (as stored in Allocation.schedule) into 24h hour/minute. */
function parseTimeSlot(time: string): { hour: number; minute: number } {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: 0, minute: 0 };
  let hour = Number(match[1]) % 12;
  if (/pm/i.test(match[3])) hour += 12;
  return { hour, minute: Number(match[2]) };
}

export type JoinState = 'before' | 'joinable' | 'ended';

export interface JoinWindow {
  state: JoinState;
  startsAt: Date; // synthetic Cairo-wall-clock instant — display only, don't compare to real UTC dates
  endsAt: Date;
}

function windowFromCairoStart(startsAt: Date, durationMinutes: number, nowCairo: Date): JoinWindow {
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
  const opensAt = new Date(startsAt.getTime() - JOIN_OPENS_MINUTES_BEFORE * 60000);
  const state: JoinState = nowCairo < opensAt ? 'before' : nowCairo > endsAt ? 'ended' : 'joinable';
  return { state, startsAt, endsAt };
}

/** Join window for a specific dated calendar occurrence (student calendar view). */
export function getJoinWindowForDate(
  dateISO: string,
  time: string,
  durationMinutes: number,
  now: Date = new Date()
): JoinWindow {
  const [y, m, d] = dateISO.split('-').map(Number);
  const { hour, minute } = parseTimeSlot(time);
  const startsAt = new Date(Date.UTC(y, m - 1, d, hour, minute));
  return windowFromCairoStart(startsAt, durationMinutes, cairoNow(now));
}

/**
 * Join window for a recurring weekday+time slot with no specific date
 * attached (teacher weekly-schedule view). Resolves against *today's*
 * occurrence in Cairo — a slot for a day other than today is always
 * 'before' (there's no meaningful "ended" state a day early).
 */
export function getJoinWindowForWeeklySlot(
  dayId: string,
  time: string,
  durationMinutes: number,
  now: Date = new Date()
): JoinWindow & { isToday: boolean } {
  const nowCairo = cairoNow(now);
  const isToday = DAY_TO_INDEX[dayId] === nowCairo.getUTCDay();
  const { hour, minute } = parseTimeSlot(time);
  const startsAt = new Date(Date.UTC(
    nowCairo.getUTCFullYear(), nowCairo.getUTCMonth(), nowCairo.getUTCDate(), hour, minute
  ));
  if (!isToday) {
    return { state: 'before', startsAt, endsAt: new Date(startsAt.getTime() + durationMinutes * 60000), isToday: false };
  }
  return { ...windowFromCairoStart(startsAt, durationMinutes, nowCairo), isToday: true };
}

/** Today's date in Cairo, as "YYYY-MM-DD" — for weekly-slot views (no
 * specific dated occurrence) that need *a* date to record attendance
 * against; calendar views already carry a real per-occurrence date. */
export function cairoTodayISO(now: Date = new Date()): string {
  const c = cairoNow(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${c.getUTCFullYear()}-${pad(c.getUTCMonth() + 1)}-${pad(c.getUTCDate())}`;
}
