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
