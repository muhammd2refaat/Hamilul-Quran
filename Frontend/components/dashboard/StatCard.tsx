'use client';

import { EE } from '@/lib/dashboard/theme';

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = EE.gold,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${EE.border}`,
        borderRadius: EE.radiusMd,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: `${accent}1F`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={accent === EE.gold ? EE.goldDeep : accent} />
      </div>
      <div>
        <div style={{ fontFamily: EE.fontHead, fontSize: 22, fontWeight: 700, color: EE.ink, lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12.5, color: EE.sageMuted, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}
