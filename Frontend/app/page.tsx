import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';
import { faqsData } from '@/components/landing/faqData';
import { SITE_URL, buildLandingSchema } from '@/lib/seo';

const TITLE = 'Elhafazah Academy | Online Qur’an Memorization, Tajweed & Hifz Classes';
const DESCRIPTION =
  'Learn Qur’an memorization (Hifz), Tajweed, and Noorani Qaida online with certified 1-on-1 teachers. Free trial class, flexible schedule, male & female teachers, students in 40+ countries.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'online Quran memorization', 'Quran memorization classes online', 'Hifz online',
    'learn Quran online', 'online Tajweed classes', 'Noorani Qaida online',
    'Quran teacher online', 'Quran classes for kids', 'ijazah online', 'Elhafazah Academy',
  ],
  alternates: {
    canonical: `${SITE_URL}/`,
    languages: {
      en: `${SITE_URL}/`,
      ar: `${SITE_URL}/ar`,
      'x-default': `${SITE_URL}/`,
    },
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/`,
    siteName: 'Elhafazah Academy',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
    alternateLocale: ['ar_AR'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function Home() {
  const faqs = faqsData.map((f) => ({ q: f.qEn, a: f.aEn }));
  const schema = buildLandingSchema('en', faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <LandingPage initialLang="en" />
    </>
  );
}
