'use client';

import { Sparkles } from 'lucide-react';
import { EE } from '@/lib/dashboard/theme';

/**
 * Clearly-labeled "coming soon" card for features without a backend yet
 * (plans/subscriptions, webinar Meet links, active/pause status).
 */
export function Placeholder({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(217,180,95,.1)',
        border: `1px dashed ${EE.goldDeep}`,
        borderRadius: EE.radiusMd,
        padding: '14px 18px',
        color: EE.goldDeep,
        fontSize: 13.5,
        fontWeight: 500,
        lineHeight: 1.5,
      }}
    >
      <Sparkles size={18} style={{ flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
}
