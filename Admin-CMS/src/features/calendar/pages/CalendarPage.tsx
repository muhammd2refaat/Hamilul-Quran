/**
 * Calendar page — all upcoming teacher/student sessions, admin-wide.
 * Sourced from GET /calendar (projected from allocation schedules; shows a
 * real Google Meet link once one has been generated for that recurring slot).
 */

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Search, Video, GraduationCap, BookOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useCalendarStore } from '../store/calendarStore';

const WEEK_OPTIONS = [2, 4, 8, 12];

export function CalendarPage() {
  const { events, isLoading, fetchEvents } = useCalendarStore();
  const [weeks, setWeeks] = useState(4);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEvents(weeks);
  }, [fetchEvents, weeks]);

  const filtered = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) => e.teacher_name.toLowerCase().includes(q) || e.student_name.toLowerCase().includes(q)
    );
  }, [events, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1 text-sm">
            All upcoming sessions across every teacher and student.
          </p>
        </div>
        <select
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {WEEK_OPTIONS.map((w) => (
            <option key={w} value={w}>
              Next {w} weeks
            </option>
          ))}
        </select>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by teacher or student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9 pe-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          Loading calendar…
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No upcoming sessions in this window.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, dayEvents]) => (
            <div key={date}>
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                {format(parseISO(date), 'EEEE, MMM d, yyyy')}
              </h3>
              <div className="space-y-2">
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {e.time}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                        <BookOpen className="h-3.5 w-3.5 text-primary-600" />
                        {e.teacher_name}
                      </span>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                        <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                        {e.student_name}
                      </span>
                      <span className="text-xs text-gray-400">{e.duration} min</span>
                    </div>

                    {e.meet_link ? (
                      <a
                        href={e.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Join
                      </a>
                    ) : (
                      <span
                        title="No Google Meet link yet — the teacher hasn't connected Google Calendar."
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Join
                      </span>
                    )}
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

export default CalendarPage;
