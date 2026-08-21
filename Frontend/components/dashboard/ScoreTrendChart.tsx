'use client';

import { EE, scoreColor } from '@/lib/dashboard/theme';
import { type SessionScore } from '@/types/dashboard';

const CHART_HEIGHT = 100;
const BAR_GAP = 6;

/**
 * A small hand-rolled bar chart of score percentage over time. Frontend has
 * no charting library (unlike Admin-CMS's recharts) — this matches the
 * codebase's existing pattern of hand-styled inline-SVG/CSS components
 * rather than pulling one in for a single chart.
 *
 * `scores` is expected oldest-first; the caller (session-scores comes back
 * newest-first from the API) should reverse before passing in.
 */
export function ScoreTrendChart({ scores }: { scores: SessionScore[] }) {
  if (scores.length < 2) return null;

  const pct = (s: SessionScore) => (s.max_score > 0 ? (s.score / s.max_score) * 100 : 0);
  const avgPct = Math.round(scores.reduce((sum, s) => sum + pct(s), 0) / scores.length);

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${EE.border}`,
        borderRadius: EE.radiusMd,
        padding: '16px 18px',
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: EE.sageMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {scores.length} sessions
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: EE.goldDeep }}>{avgPct}% avg</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: BAR_GAP, height: CHART_HEIGHT }}>
        {scores.map((s, i) => {
          const p = pct(s);
          const colors = scoreColor(s.score, s.max_score);
          return (
            <div
              key={s.id ?? i}
              title={`${new Date(s.date).toLocaleDateString()} — ${s.score}/${s.max_score}`}
              style={{
                flex: 1,
                height: `${Math.max(p, 4)}%`,
                background: colors.fg,
                borderRadius: '4px 4px 0 0',
                minWidth: 4,
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: EE.sageFaint }}>
        <span>{new Date(scores[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(scores[scores.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
