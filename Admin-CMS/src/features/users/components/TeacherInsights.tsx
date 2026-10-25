/**
 * Teacher qualifications and reviews for the Teachers page.
 *
 * Qualifications come from the profile the teacher filled in at sign-up
 * (GET /teachers/:id/full); the certificate is fetched as an authenticated
 * blob because the file endpoint needs the admin's session.
 *
 * Reviews (GET /teachers/:id/reviews) are of two kinds: students rating one
 * lesson they joined, and admin audits, which may point at a lesson too.
 */
import { useEffect, useMemo, useState } from 'react';
import { Award, FileText, Loader2, Plus, Star, ShieldCheck, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { AxiosRequestConfig } from 'axios';
import { Button, Modal } from '@/shared/components';
import { get, post } from '@/services/api/client';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type IjazaType = 'HIFZ' | 'TILAWAH' | 'HAFS_AN_ASIM' | 'TEN_QIRAAT' | 'OTHER';

interface TeacherProfile {
  worked_online_before: boolean;
  juz_memorized: number | null;
  certificate_path: string | null;
  ijazas: { id: string; ijaza_type: IjazaType }[];
}

type ReviewKind = 'student_session' | 'admin_audit' | 'general';

interface TeacherReview {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  kind: ReviewKind;
  session_date: string | null;
  scheduled_time: string | null;
  student_name: string | null;
  created_at: string;
  updated_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stars({ value, size = 'h-3.5 w-3.5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </span>
  );
}

const average = (list: TeacherReview[]) =>
  list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : null;

const lessonLabel = (date: string, time: string) => `${format(parseISO(date), 'EEE d MMM yyyy')} · ${time}`;

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
      <Icon className="h-3.5 w-3.5" /> {children}
    </p>
  );
}

// ─── Qualifications ───────────────────────────────────────────────────────────

export function TeacherQualifications({ teacherId }: { teacherId: string }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none' | 'error'>('loading');
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The page shows its own message for a missing profile — no error toast.
    get<TeacherProfile>(`/teachers/${teacherId}/full`, { skipErrorToast: true } as AxiosRequestConfig)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setState('ready');
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch((error: any) => {
        // 404 = a teacher added by an admin never filled in the sign-up profile.
        if (!cancelled) setState(error?.response?.status === 404 ? 'none' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  const openCertificate = async () => {
    // Opened before the request so the browser doesn't treat it as a popup.
    const tab = window.open('', '_blank');
    setOpening(true);
    try {
      const blob = await get<Blob>(`/teachers/${teacherId}/certificate`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      tab?.close();
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="px-5 py-3 border-b border-gray-100">
      <SectionTitle icon={Award}>{t('teachers.qualifications')}</SectionTitle>
      {state === 'loading' ? (
        <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('teachers.loading')}</p>
      ) : state === 'none' ? (
        <p className="text-sm text-gray-400">{t('teachers.noProfile')}</p>
      ) : state === 'error' || !profile ? (
        <p className="text-sm text-red-500">{t('teachers.loadFailed')}</p>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {profile.ijazas.length === 0 ? (
              <span className="text-sm text-gray-400">{t('teachers.noIjazas')}</span>
            ) : (
              profile.ijazas.map((i) => (
                <span key={i.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-800 border border-primary-200">
                  <Award className="h-3 w-3" /> {t(`teachers.ijaza.${i.ijaza_type}`)}
                </span>
              ))
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">{t('teachers.juzMemorized')}</p>
              <p className="font-semibold text-gray-900">
                {profile.juz_memorized != null ? t('teachers.juzOf30', { count: profile.juz_memorized }) : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">{t('teachers.taughtOnline')}</p>
              <p className="font-semibold text-gray-900">{profile.worked_online_before ? t('teachers.yes') : t('teachers.no')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">{t('teachers.certificate')}</p>
              {profile.certificate_path ? (
                <button
                  type="button"
                  onClick={openCertificate}
                  disabled={opening}
                  className="font-semibold text-primary-700 hover:underline inline-flex items-center gap-1"
                >
                  {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  {t('teachers.viewCertificate')}
                </button>
              ) : (
                <p className="font-semibold text-gray-400">{t('teachers.notUploaded')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

type ReviewFilter = 'all' | 'student_session' | 'admin_audit';
const PREVIEW_COUNT = 5;

export function TeacherReviews({ teacherId, teacherName }: { teacherId: string; teacherName: string }) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<TeacherReview[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    get<TeacherReview[]>(`/teachers/${teacherId}/reviews`)
      .then((data) => {
        if (cancelled) return;
        setReviews(data);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  const students = useMemo(() => reviews.filter((r) => r.kind === 'student_session'), [reviews]);
  const audits = useMemo(() => reviews.filter((r) => r.kind === 'admin_audit'), [reviews]);
  const shown = filter === 'all' ? reviews : filter === 'student_session' ? students : audits;
  const visible = showAll ? shown : shown.slice(0, PREVIEW_COUNT);

  const summary = [
    { key: 'all' as const, label: t('teachers.overall'), avg: average(reviews), count: reviews.length, icon: Star },
    { key: 'student_session' as const, label: t('teachers.studentRatings'), avg: average(students), count: students.length, icon: GraduationCap },
    { key: 'admin_audit' as const, label: t('teachers.adminAudits'), avg: average(audits), count: audits.length, icon: ShieldCheck },
  ];

  return (
    <div className="px-5 py-3 border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <SectionTitle icon={Star}>{t('teachers.reviews')}</SectionTitle>
        <button
          type="button"
          onClick={() => setAuditOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900"
        >
          <Plus className="h-3.5 w-3.5" /> {t('teachers.addEvaluation')}
        </button>
      </div>

      {state === 'loading' ? (
        <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('teachers.loading')}</p>
      ) : state === 'error' ? (
        <p className="text-sm text-red-500">{t('teachers.loadFailed')}</p>
      ) : (
        <>
          {/* Summary — doubles as the filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            {summary.map(({ key, label, avg, count, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setFilter(key); setShowAll(false); }}
                className={`text-start rounded-lg px-3 py-2 border transition-colors ${
                  filter === key ? 'border-primary-400 bg-primary-50' : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500 flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</p>
                <p className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-bold text-gray-900">{avg != null ? avg.toFixed(1) : '—'}</span>
                  {avg != null && <Stars value={avg} />}
                </p>
                <p className="text-xs text-gray-400">{t('teachers.reviewCount', { count })}</p>
              </button>
            ))}
          </div>

          {/* Breakdown */}
          {shown.length === 0 ? (
            <p className="text-sm text-gray-400 py-2 text-center">
              {filter === 'admin_audit' ? t('teachers.noAudits') : t('teachers.noReviews')}
            </p>
          ) : (
            <div className="space-y-2">
              {visible.map((r) => <ReviewRow key={r.id} review={r} />)}
              {shown.length > PREVIEW_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAll((s) => !s)}
                  className="w-full text-xs font-semibold text-primary-700 hover:text-primary-900 py-1"
                >
                  {showAll ? t('teachers.showLess') : t('teachers.showAll', { count: shown.length })}
                </button>
              )}
            </div>
          )}
        </>
      )}

      <AuditModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        teacherId={teacherId}
        teacherName={teacherName}
        onSaved={(review) => {
          setReviews((list) => [review, ...list]);
          setState('ready');
        }}
      />
    </div>
  );
}

function ReviewRow({ review }: { review: TeacherReview }) {
  const { t } = useTranslation();
  const isAudit = review.kind === 'admin_audit';
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Stars value={review.rating} />
        <span className="text-sm font-semibold text-gray-900">{review.reviewer_name}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
            isAudit ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {t(`teachers.kind.${review.kind}`)}
        </span>
        <span className="text-xs text-gray-400 ms-auto">
          {format(new Date(review.updated_at ?? review.created_at), 'd MMM yyyy')}
        </span>
      </div>
      {review.session_date && review.scheduled_time && (
        <p className="text-xs text-gray-500 mt-1">
          {t('teachers.lesson')}: {lessonLabel(review.session_date, review.scheduled_time)}
          {isAudit && review.student_name && ` — ${review.student_name}`}
        </p>
      )}
      {review.comment && <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{review.comment}</p>}
    </div>
  );
}

// ─── Admin audit modal ────────────────────────────────────────────────────────

function AuditModal({
  isOpen, onClose, teacherId, teacherName, onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName: string;
  onSaved: (review: TeacherReview) => void;
}) {
  const { t } = useTranslation();
  const { records, fetchAttendance } = useAttendanceStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [lessonKey, setLessonKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) fetchAttendance();
  }, [isOpen, fetchAttendance]);

  // This teacher's recent lessons, newest first, to optionally attach.
  const lessons = useMemo(
    () =>
      records
        .filter((r) => r.teacherId === teacherId)
        .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
        .slice(0, 40),
    [records, teacherId]
  );

  const reset = () => {
    setRating(0);
    setComment('');
    setLessonKey('');
  };

  const save = async () => {
    if (!rating) {
      toast.error(t('teachers.pickRating'));
      return;
    }
    const lesson = lessons.find((l) => `${l.allocationId}|${l.sessionDate}|${l.scheduledTime}` === lessonKey);
    setSaving(true);
    try {
      const review = await post<TeacherReview>(`/teachers/${teacherId}/reviews`, {
        rating,
        comment: comment.trim() || null,
        ...(lesson && {
          allocation_id: lesson.allocationId,
          session_date: lesson.sessionDate,
          scheduled_time: lesson.scheduledTime,
        }),
      });
      onSaved(review);
      toast.success(t('teachers.evaluationSaved'));
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('teachers.evaluateTitle', { name: teacherName })}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('attendance.cancel')}</Button>
          <Button onClick={save} isLoading={saving}>{t('teachers.saveEvaluation')}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-1">{t('teachers.rating')}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} / 5`}>
                <Star className={`h-7 w-7 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="audit-lesson">
            {t('teachers.lessonOptional')}
          </label>
          <select
            id="audit-lesson"
            value={lessonKey}
            onChange={(e) => setLessonKey(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t('teachers.generalEvaluation')}</option>
            {lessons.map((l) => (
              <option key={`${l.allocationId}|${l.sessionDate}|${l.scheduledTime}`} value={`${l.allocationId}|${l.sessionDate}|${l.scheduledTime}`}>
                {lessonLabel(l.sessionDate, l.scheduledTime)} — {l.studentName} ({t(`attendance.completeness.${l.status}`)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="audit-comment">
            {t('teachers.notes')}
          </label>
          <textarea
            id="audit-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder={t('teachers.notesPlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
      </div>
    </Modal>
  );
}
