/**
 * Monthly lesson history — GET /sessions/attendance/history?month=YYYY-MM.
 *
 * One row per teacher (or student): lessons scheduled in the month versus
 * how they went. A teacher is credited for done lessons plus student
 * no-shows. Clicking a row lists that person's lessons for the month.
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { get } from '@/services/api/client';
import type { AttendanceStatus, HistoryLesson, MonthlyHistory, StudentHistory, TeacherHistory } from '../types';

const BADGE: Record<AttendanceStatus | 'upcoming', string> = {
  both: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-emerald-50 text-emerald-800',
  teacher_only: 'bg-amber-100 text-amber-700',
  student_only: 'bg-red-100 text-red-700',
  missed: 'bg-gray-100 text-gray-700',
  excused: 'bg-sky-100 text-sky-700',
  not_scheduled: 'bg-white text-gray-400 border border-dashed border-gray-300',
  pending: 'bg-white text-gray-500 border border-gray-200',
  upcoming: 'bg-primary-50 text-primary-700',
};

type View = 'teachers' | 'students';

const currentMonth = () => format(new Date(), 'yyyy-MM');

function Num({ value, strong, tone }: { value: number | string | null; strong?: boolean; tone?: string }) {
  return (
    <td className={`px-3 py-2.5 text-center tabular-nums ${strong ? 'font-bold text-gray-900' : 'text-gray-700'} ${tone ?? ''}`}>
      {value === 0 ? <span className="text-gray-300">0</span> : value ?? '—'}
    </td>
  );
}

export function MonthlyHistoryView() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState<View>('teachers');
  const [data, setData] = useState<MonthlyHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    get<MonthlyHistory>(`/sessions/attendance/history?month=${month}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, reloadKey]);

  const rows: (TeacherHistory | StudentHistory)[] = data ? (view === 'teachers' ? data.teachers : data.students) : [];

  const lessonsOf = useMemo(() => {
    const map: Record<string, HistoryLesson[]> = {};
    for (const l of data?.lessons ?? []) {
      const key = view === 'teachers' ? l.teacher_id : l.student_id;
      if (key) (map[key] ??= []).push(l);
    }
    return map;
  }, [data, view]);

  const totals = useMemo(() => {
    const sum = (k: keyof TeacherHistory) =>
      (data?.teachers ?? []).reduce((acc, r) => acc + (r[k] as number), 0);
    return {
      scheduled: sum('scheduled'),
      done: sum('done'),
      noShow: sum('student_no_show') + sum('teacher_no_show'),
      missed: sum('missed'),
      upcoming: sum('upcoming'),
    };
  }, [data]);

  const isTeachers = view === 'teachers';
  const columns = isTeachers
    ? ['scheduled', 'done', 'student_no_show', 'teacher_no_show', 'missed', 'excused', 'upcoming', 'credited']
    : ['plan', 'scheduled', 'done', 'student_no_show', 'teacher_no_show', 'missed', 'excused', 'upcoming', 'sessions_left', 'ends_on'];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          aria-label={t('attendance.history.month')}
        />
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
          {(['teachers', 'students'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { setView(v); setOpen(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                view === v ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t(`attendance.history.${v}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('common.refresh')}
        </button>
      </div>

      {/* Month totals */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: t('attendance.history.col.scheduled'), value: totals.scheduled },
            { label: t('attendance.history.col.done'), value: totals.done },
            { label: t('attendance.history.noShows'), value: totals.noShow },
            { label: t('attendance.history.col.missed'), value: totals.missed },
            { label: t('attendance.history.col.upcoming'), value: totals.upcoming },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-xl font-extrabold text-gray-900">{value}</p>
              <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading && !data ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> {t('attendance.loading')}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-red-500">{t('attendance.history.loadFailed')}</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">{t('attendance.history.empty')}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2.5 text-start">{t(isTeachers ? 'attendance.history.teacher' : 'attendance.history.student')}</th>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2.5 text-center whitespace-nowrap">{t(`attendance.history.col.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const expanded = open === r.id;
                const s = r as StudentHistory;
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setOpen(expanded ? null : r.id)}
                      className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400 rtl:rotate-180" />}
                          {r.name}
                        </span>
                      </td>
                      {!isTeachers && (
                        <td className="px-3 py-2.5 text-center text-xs text-gray-600 whitespace-nowrap">
                          {s.plan_name ?? '—'}
                          {s.sessions_per_week ? ` · ${t('attendance.history.perWeek', { count: s.sessions_per_week })}` : ''}
                        </td>
                      )}
                      <Num value={r.scheduled} strong />
                      <Num value={r.done} tone="text-emerald-700" />
                      <Num value={r.student_no_show} />
                      <Num value={r.teacher_no_show} />
                      <Num value={r.missed} />
                      <Num value={r.excused} />
                      <Num value={r.upcoming} />
                      {isTeachers ? (
                        <Num value={(r as TeacherHistory).credited} strong tone="bg-primary-50/60" />
                      ) : (
                        <>
                          <Num value={s.sessions_remaining} />
                          <td className="px-3 py-2.5 text-center text-xs whitespace-nowrap">
                            {s.ends_on ? format(parseISO(s.ends_on), 'd MMM yyyy') : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                    {expanded && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={columns.length + 1} className="px-4 py-3">
                          <LessonList lessons={lessonsOf[r.id] ?? []} showTeacher={!isTeachers} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400">{t(isTeachers ? 'attendance.history.creditedHelp' : 'attendance.history.studentHelp')}</p>
    </div>
  );
}

function LessonList({ lessons, showTeacher }: { lessons: HistoryLesson[]; showTeacher: boolean }) {
  const { t } = useTranslation();
  if (lessons.length === 0) return <p className="text-sm text-gray-400">{t('attendance.history.noLessons')}</p>;
  return (
    <div className="space-y-1.5">
      {lessons.map((l) => (
        <div key={`${l.session_date}-${l.scheduled_time}-${l.teacher_id}-${l.student_id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="w-40 text-gray-700 tabular-nums">
            {format(parseISO(l.session_date), 'EEE d MMM')} · {l.scheduled_time}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE[l.status] ?? BADGE.pending}`}>
            {t(l.status === 'upcoming' ? 'attendance.history.col.upcoming' : `attendance.completeness.${l.status}`)}
          </span>
          <span className="text-gray-600">{showTeacher ? l.teacher_name : l.student_name}</span>
          {l.note && <span className="text-xs text-gray-500 italic">“{l.note}”</span>}
        </div>
      ))}
    </div>
  );
}
