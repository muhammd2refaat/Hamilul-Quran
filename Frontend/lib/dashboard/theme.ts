/**
 * "Emerald Editorial" design tokens, shared by the student & teacher portals.
 * Mirrors the palette used in app/page.tsx (the public landing page) and the
 * Elhafazah design-system source (Elhafazah - Emerald Editorial.dc.html).
 */

export const EE = {
  emerald: '#0C3326',
  emeraldDeep: '#0A2A20',
  emeraldMid: '#15463A',
  gold: '#D9B45F',
  goldDeep: '#B08A2E',
  parchment: '#F1EBDD',
  ink: '#10241C',
  sage: '#9DB5A0',
  sageLight: '#B9CBBC',
  sageMuted: '#5C6B5F',
  sageFaint: '#7A857C',
  border: 'rgba(12,51,38,.14)',
  borderLight: 'rgba(185,203,188,.3)',

  fontHead: "'Space Grotesk','Reem Kufi',sans-serif",
  fontArabicDisplay: "'Reem Kufi',sans-serif",
  fontBody: "'Manrope','Tajawal',sans-serif",

  radiusSm: '8px',
  radiusMd: '13px',
  radiusLg: '16px',
  radiusXl: '20px',
} as const;

export const ARCH_PATTERN =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><g fill='none' stroke='%23D9B45F' stroke-width='1'><path d='M28 2 L38 18 L54 28 L38 38 L28 54 L18 38 L2 28 L18 18 Z'/></g></svg>")`;

export const STAR_PATTERN =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70' viewBox='0 0 70 70'><g fill='none' stroke='%23D9B45F' stroke-width='1'><path d='M35 2 L47 23 L68 35 L47 47 L35 68 L23 47 L2 35 L23 23 Z'/><circle cx='35' cy='35' r='13'/></g></svg>")`;

/** Session score badge color by percentage of max_score. */
export function scoreColor(score: number, maxScore: number): { bg: string; fg: string } {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct >= 0.85) return { bg: 'rgba(16,163,74,.12)', fg: '#0F7A3D' };
  if (pct >= 0.6) return { bg: 'rgba(217,180,95,.18)', fg: EE.goldDeep };
  return { bg: 'rgba(220,38,38,.1)', fg: '#B91C1C' };
}
