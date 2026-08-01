'use client';

import { BookOpen } from 'lucide-react';
import { useLang } from '@/lib/dashboard/i18n';
import { EE } from '@/lib/dashboard/theme';
import { ArchPanel } from '@/components/dashboard/ArchPanel';
import { SectionHeader } from '@/components/dashboard/SectionHeader';

export default function AboutPage() {
  const { t } = useLang();

  return (
    <div>
      <SectionHeader title={t.aboutTitle} />
      <ArchPanel>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(217,180,95,.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BookOpen size={22} color={EE.gold} />
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: EE.sageLight, margin: 0, maxWidth: 560 }}>
            {t.aboutBody}
          </p>
        </div>
      </ArchPanel>
    </div>
  );
}
