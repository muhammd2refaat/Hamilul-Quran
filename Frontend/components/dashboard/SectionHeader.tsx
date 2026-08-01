'use client';

import { EE } from '@/lib/dashboard/theme';

export function SectionHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        marginBottom: 22,
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: EE.fontHead,
            fontSize: 26,
            fontWeight: 600,
            color: EE.ink,
            letterSpacing: '-.3px',
            margin: 0,
          }}
        >
          {title}
        </h1>
        {desc && <p style={{ fontSize: 14, color: EE.sageMuted, marginTop: 6, maxWidth: 520 }}>{desc}</p>}
      </div>
      {action}
    </div>
  );
}
