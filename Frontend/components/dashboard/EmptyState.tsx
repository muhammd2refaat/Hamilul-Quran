'use client';

import { EE } from '@/lib/dashboard/theme';

export function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  text: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${EE.border}`,
        borderRadius: EE.radiusMd,
        padding: '40px 20px',
        textAlign: 'center',
        color: EE.sageFaint,
      }}
    >
      <Icon size={32} color={EE.sageFaint} />
      <p style={{ marginTop: 12, fontSize: 14 }}>{text}</p>
    </div>
  );
}
