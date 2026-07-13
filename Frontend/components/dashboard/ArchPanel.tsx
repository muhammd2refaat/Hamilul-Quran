'use client';

import { EE, ARCH_PATTERN } from '@/lib/dashboard/theme';

/**
 * The emerald arch-shaped panel motif from the landing page hero, reused as
 * a compact "hero" banner inside dashboard pages (e.g. welcome cards).
 */
export function ArchPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: `linear-gradient(165deg, ${EE.emeraldMid}, ${EE.emeraldDeep})`,
        border: `1.5px solid rgba(217,180,95,.35)`,
        borderRadius: `${EE.radiusLg} ${EE.radiusLg} 6px 6px`,
        position: 'relative',
        overflow: 'hidden',
        padding: '28px 30px',
        color: EE.parchment,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.1,
          backgroundImage: ARCH_PATTERN,
          backgroundSize: '56px 56px',
        }}
      />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}
