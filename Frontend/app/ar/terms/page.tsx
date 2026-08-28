import type { Metadata } from 'next';
import { TermsContent } from '@/components/legal/TermsContent';
import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'شروط الخدمة',
  alternates: {
    canonical: `${SITE_URL}/ar/terms`,
    languages: {
      en: `${SITE_URL}/terms`,
      ar: `${SITE_URL}/ar/terms`,
      'x-default': `${SITE_URL}/terms`,
    },
  },
};

export default function TermsOfServicePageArabic() {
  return <TermsContent initialLang="ar" />;
}
