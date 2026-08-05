import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';
import { faqsData } from '@/components/landing/faqData';
import { SITE_URL, buildLandingSchema } from '@/lib/seo';

const TITLE = 'أكاديمية الحفظة | حفظ القرآن الكريم والتجويد أونلاين';
const DESCRIPTION =
  'احفظ القرآن الكريم وتعلّم التجويد والقاعدة النورانية أونلاين مع معلمين ومعلمات مجازين، بحصص فردية مباشرة. حصة تجريبية مجانية، مواعيد مرنة، طلاب في أكثر من ٤٠ دولة.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'حفظ القرآن أونلاين', 'تعلم القرآن اونلاين', 'حفظ القرآن الكريم', 'دروس تجويد أونلاين',
    'القاعدة النورانية أونلاين', 'معلم قرآن أونلاين', 'تحفيظ القرآن للأطفال', 'إجازة قرآن أونلاين',
    'أكاديمية الحفظة',
  ],
  alternates: {
    canonical: `${SITE_URL}/ar`,
    languages: {
      en: `${SITE_URL}/`,
      ar: `${SITE_URL}/ar`,
      'x-default': `${SITE_URL}/`,
    },
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/ar`,
    siteName: 'أكاديمية الحفظة',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'ar_AR',
    alternateLocale: ['en_US'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function HomeArabic() {
  const faqs = faqsData.map((f) => ({ q: f.qAr, a: f.aAr }));
  const schema = buildLandingSchema('ar', faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <LandingPage initialLang="ar" />
    </>
  );
}
