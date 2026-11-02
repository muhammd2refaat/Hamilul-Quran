'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type TeacherRatings } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { EE } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} color={n <= Math.round(value) ? EE.goldDeep : '#C9C4B5'} fill={n <= Math.round(value) ? EE.gold : 'none'} />
      ))}
    </span>
  );
}

export default function TeacherRatingsPage() {
  const { t, lang } = useLang();
  const [data, setData] = useState<TeacherRatings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<TeacherRatings>('/lesson-reviews/teacher/me')
      .then(({ data }) => {
        if (!cancelled) setData(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div>
      <SectionHeader title={t.ratingsTitle} desc={t.ratingsDesc} />

      {loading ? (
        <p style={{ color: EE.sageMuted, fontSize: 14 }}>{t.loading}</p>
      ) : !data || data.count === 0 ? (
        <EmptyState icon={Star} text={t.ratingsEmpty} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary */}
          <div
            style={{
              background: '#fff',
              border: `1px solid ${EE.border}`,
              borderRadius: EE.radiusMd,
              padding: '18px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 24,
            }}
          >
            <div>
              <div style={{ fontSize: 12.5, color: EE.sageMuted, fontWeight: 600 }}>{t.ratingsAverage}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <span style={{ fontFamily: EE.fontHead, fontSize: 30, fontWeight: 700, color: EE.ink }}>
                  {data.average?.toFixed(1)}
                </span>
                <Stars value={data.average ?? 0} size={18} />
              </div>
              <div style={{ fontSize: 12.5, color: EE.sageFaint }}>
                {data.count} {t.ratingsCount}
              </div>
            </div>
            <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(['5', '4', '3', '2', '1'] as const).map((star) => {
                const n = data.distribution[star];
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: EE.sageMuted }}>
                    <span style={{ width: 12, textAlign: 'center' }}>{star}</span>
                    <Star size={12} color={EE.goldDeep} fill={EE.gold} />
                    <div style={{ flex: 1, height: 7, borderRadius: 4, background: '#EEE9DC', overflow: 'hidden' }}>
                      <div style={{ width: `${(n / data.count) * 100}%`, height: '100%', background: EE.gold }} />
                    </div>
                    <span style={{ width: 22, textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Each lesson */}
          {data.reviews.map((r) => (
            <div
              key={r.id}
              style={{
                background: '#fff',
                border: `1px solid ${EE.border}`,
                borderRadius: EE.radiusMd,
                padding: '14px 18px',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: EE.ink }}>{r.student_name ?? '—'}</div>
                  {r.session_date && (
                    <div style={{ fontSize: 12.5, color: EE.sageMuted }}>
                      {formatDate(r.session_date)}
                      {r.scheduled_time ? ` · ${r.scheduled_time}` : ''}
                    </div>
                  )}
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment && (
                <p style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.6, color: EE.ink, whiteSpace: 'pre-wrap' }}>
                  “{r.comment}”
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
