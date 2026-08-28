import type { Metadata } from 'next';
import { PrivacyContent } from '@/components/legal/PrivacyContent';
import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية',
  alternates: {
    canonical: `${SITE_URL}/ar/privacy`,
    languages: {
      en: `${SITE_URL}/privacy`,
      ar: `${SITE_URL}/ar/privacy`,
      'x-default': `${SITE_URL}/privacy`,
    },
  },
};

export default function PrivacyPolicyPageArabic() {
  return <PrivacyContent initialLang="ar" />;
}
