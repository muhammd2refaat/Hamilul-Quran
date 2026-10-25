/**
 * Step 3 of the allocation modal: which lessons saving would put on the
 * teacher's Google Calendar, given the student's remaining sessions
 * (POST /allocations/preview). A subscription is a number of sessions, so
 * the series ends on the last paid lesson, whatever day of the month the
 * allocation starts.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarCheck2, Infinity as InfinityIcon, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { post } from '@/services/api/client';

interface Preview {
  subscription_status: string | null;
  plan_name: string | null;
  sessions_remaining: number | null;
  open_ended: boolean;
  ends_on: string | null;
  lessons: { session_date: string; day: string; time: string; this_allocation: boolean }[];
  by_month: { month: string; count: number }[];
}

export function AllocationPreview({
  studentId, duration, schedule, allocationId,
}: {
  studentId: string;
  duration: number;
  schedule: { day: string; time: string }[];
  allocationId: string | null;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const scheduleKey = JSON.stringify(schedule);

  useEffect(() => {
    if (!studentId || schedule.length === 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // Debounced: slots are toggled one click at a time.
    const timer = setTimeout(() => {
      post<Preview>('/allocations/preview', {
        student_id: studentId, duration, schedule, allocation_id: allocationId,
      })
        .then((data) => {
          if (!cancelled) setPreview(data);
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // scheduleKey stands in for `schedule` (a new array every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, duration, scheduleKey, allocationId]);

  if (schedule.length === 0) return null;

  const mine = preview?.lessons.filter((l) => l.this_allocation) ?? [];
  const inactive = preview?.subscription_status && preview.subscription_status !== 'active';
  const noneLeft = preview && !preview.open_ended && mine.length === 0;

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-gray-900 flex items-center gap-2">
          <CalendarCheck2 className="h-5 w-5 text-primary-600" /> {t('allocations.preview.title')}
        </p>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-primary-600" />}
      </div>

      {preview && (
        <>
          <p className="text-sm text-gray-700">
            {preview.sessions_remaining == null
              ? t('allocations.preview.noPlan')
              : t('allocations.preview.plan', { plan: preview.plan_name, count: preview.sessions_remaining })}
          </p>

          {inactive ? (
            <Warning text={t('allocations.preview.inactive', { status: preview.subscription_status })} />
          ) : noneLeft ? (
            <Warning text={t('allocations.preview.noneLeft')} />
          ) : preview.open_ended ? (
            <p className="text-sm text-amber-800 flex items-start gap-2">
              <InfinityIcon className="h-4 w-4 mt-0.5 flex-shrink-0" /> {t('allocations.preview.openEnded')}
            </p>
          ) : (
            <p className="text-sm font-semibold text-gray-900">
              {t('allocations.preview.summary', {
                count: mine.length,
                end: preview.ends_on ? format(parseISO(preview.ends_on), 'EEE d MMM yyyy') : '—',
              })}
            </p>
          )}

          {preview.lessons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {preview.lessons.map((l) => (
                <span
                  key={`${l.session_date}-${l.time}-${l.this_allocation}`}
                  title={l.this_allocation ? undefined : t('allocations.preview.otherAllocation')}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                    l.this_allocation
                      ? 'bg-white border-primary-300 text-primary-800'
                      : 'bg-gray-50 border-dashed border-gray-300 text-gray-500'
                  }`}
                >
                  {format(parseISO(l.session_date), 'EEE d MMM')} · {l.time}
                </span>
              ))}
            </div>
          )}

          {!preview.open_ended && preview.by_month.length > 0 && (
            <p className="text-xs text-gray-600">
              {preview.by_month
                .map((m) => t('allocations.preview.inMonth', {
                  month: format(parseISO(`${m.month}-01`), 'MMMM yyyy'), count: m.count,
                }))
                .join(' · ')}
            </p>
          )}
          {preview.lessons.some((l) => !l.this_allocation) && (
            <p className="text-xs text-gray-500">{t('allocations.preview.sharedNote')}</p>
          )}
        </>
      )}
    </div>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {text}
    </p>
  );
}
