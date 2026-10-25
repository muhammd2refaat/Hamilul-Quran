'use client';

import { useEffect, useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useLang } from '@/lib/dashboard/i18n';
import { EE } from '@/lib/dashboard/theme';

interface ReviewableLesson {
  allocation_id: string;
  session_date: string; // "YYYY-MM-DD", Cairo
  scheduled_day: string;
  scheduled_time: string;
  teacher_name: string;
  rating: number | null;
  comment: string | null;
}

const MAX_SHOWN = 3;
const lessonKey = (l: ReviewableLesson) => `${l.allocation_id}|${l.session_date}|${l.scheduled_time}`;

/**
 * "Rate your recent lessons" — lessons the student joined in the last two
 * weeks that they haven't rated yet. Ratings go to the admin's per-teacher
 * breakdown (POST /lesson-reviews). Renders nothing when there's nothing
 * to rate.
 */
export function LessonRatingCard() {
  const { t, lang } = useLang();
  const [lessons, setLessons] = useState<ReviewableLesson[]>([]);
  // Lessons rated during this visit stay on screen with a thank-you.
  const [rated, setRated] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<ReviewableLesson[]>('/lesson-reviews/me')
      .then(({ data }) => {
        if (!cancelled) setLessons(data.filter((l) => l.rating == null).slice(0, MAX_SHOWN));
      })
      .catch(() => {
        // Optional prompt — show nothing on failure.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (lessons.length === 0) return null;

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'short',
    });
  };

  return (
    <div
      style={{
        marginTop: 22,
        padding: '20px 22px',
        borderRadius: 14,
        background: '#fff',
        border: `1px solid ${EE.border}`,
      }}
    >
      <div style={{ fontFamily: EE.fontHead, fontSize: 17, fontWeight: 600, color: EE.ink, marginBottom: 4 }}>
        {t.rateTitle}
      </div>
      <p style={{ fontSize: 13.5, color: EE.sageMuted, lineHeight: 1.6, margin: '0 0 14px' }}>{t.rateDesc}</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {lessons.map((l) => (
          <LessonRow
            key={lessonKey(l)}
            lesson={l}
            when={`${formatDate(l.session_date)} · ${l.scheduled_time}`}
            done={rated.has(lessonKey(l))}
            onDone={() => setRated((s) => new Set(s).add(lessonKey(l)))}
          />
        ))}
      </div>
    </div>
  );
}

function LessonRow({
  lesson, when, done, onDone,
}: {
  lesson: ReviewableLesson;
  when: string;
  done: boolean;
  onDone: () => void;
}) {
  const { t } = useLang();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    setBusy(true);
    setError(false);
    try {
      await apiClient.post('/lesson-reviews', {
        allocation_id: lesson.allocation_id,
        session_date: lesson.session_date,
        scheduled_time: lesson.scheduled_time,
        rating,
        comment: comment.trim() || null,
      });
      onDone();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(241,235,221,.55)', border: `1px solid ${EE.border}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: EE.ink }}>{when}</div>
          <div style={{ fontSize: 13, color: EE.sageMuted }}>{t.rateWith} {lesson.teacher_name}</div>
        </div>
        {done ? (
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F7A3D' }}>{t.rateThanks}</span>
        ) : (
          <div style={{ display: 'flex', gap: 2 }} onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = n <= (hover || rating);
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} / 5`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  style={{ background: 'none', border: 'none', padding: 3, cursor: 'pointer', lineHeight: 0 }}
                >
                  <Star size={24} color={on ? EE.goldDeep : '#C9C4B5'} fill={on ? EE.gold : 'none'} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!done && rating > 0 && (
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder={t.rateCommentPlaceholder}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8,
              border: `1px solid ${EE.border}`, fontFamily: 'inherit', fontSize: 14, resize: 'vertical',
              background: '#fff', color: EE.ink,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, background: EE.emerald, color: EE.parchment,
                border: 'none', padding: '10px 18px', borderRadius: 9, fontSize: 14, fontWeight: 600,
                fontFamily: 'inherit', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.75 : 1,
              }}
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {t.rateSubmit}
            </button>
            {error && <span style={{ fontSize: 13, color: '#B3261E' }}>{t.rateError}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
