// Shared SEO constants + JSON-LD builders for the public marketing pages
// (app/page.tsx = English, app/ar/page.tsx = Arabic). Kept framework-agnostic
// (plain objects) so both server page components can import and embed the
// result via a <script type="application/ld+json"> tag.

export const SITE_URL = 'https://elhafazah-academy.com';
export const SITE_NAME = 'Elhafazah Academy';
export const SITE_NAME_AR = 'أكاديمية الحفظة';

export type SeoLang = 'en' | 'ar';

export interface Faq {
  q: string;
  a: string;
}

const COURSES = [
  {
    slug: 'noorani-qaida',
    nameEn: 'Noorani Qaida',
    nameAr: 'القاعدة النورانية',
    descEn: 'Master the Arabic letters, their sounds and joins — the confident foundation for reading the Mushaf.',
    descAr: 'إتقان الحروف العربية وأصواتها ووصلها — الأساس المتين لقراءة المصحف.',
  },
  {
    slug: 'tajweed',
    nameEn: 'Tajweed',
    nameAr: 'التجويد',
    descEn: 'Perfect the rules of Qur’an recitation — makharij, ghunnah, madd — online with a certified teacher.',
    descAr: 'إتقان أحكام تلاوة القرآن — المخارج والغنّة والمدّ — أونلاين مع معلّم مجاز.',
  },
  {
    slug: 'hifz',
    nameEn: 'Hifz (Qur’an Memorization)',
    nameAr: 'الحفظ',
    descEn: 'A structured Qur’an memorization journey with revision cycles, progress tracking, and an ijazah pathway.',
    descAr: 'رحلة حفظ قرآن منظّمة مع دورات للمراجعة ومتابعة للتقدّم ومسار للإجازة.',
  },
] as const;

/**
 * Full JSON-LD graph for the landing page: EducationalOrganization + WebSite
 * + one Course per program + FAQPage. Google (rich results) and AI answer
 * engines (Claude/ChatGPT/Gemini/Perplexity) both use this kind of explicit,
 * unambiguous markup far more reliably than parsing prose.
 */
export function buildLandingSchema(lang: SeoLang, faqs: Faq[]) {
  const isAr = lang === 'ar';
  const pageUrl = isAr ? `${SITE_URL}/ar` : `${SITE_URL}/`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: SITE_NAME_AR,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.ico`,
        description: isAr
          ? 'أكاديمية أونلاين لحفظ القرآن الكريم (الحفظ) والتجويد والقاعدة النورانية، بحصص فردية مباشرة مع معلمين ومعلمات مجازين، للأطفال والكبار حول العالم.'
          : 'Online academy for Qur’an memorization (Hifz), Tajweed, and Noorani Qaida — live 1-on-1 classes with certified male and female teachers, for children and adults worldwide.',
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: ['en', 'ar'],
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      ...COURSES.map((c) => ({
        '@type': 'Course',
        '@id': `${pageUrl}#course-${c.slug}`,
        name: isAr ? c.nameAr : c.nameEn,
        description: isAr ? c.descAr : c.descEn,
        provider: { '@id': `${SITE_URL}/#organization` },
        inLanguage: lang,
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT1H',
        },
      })),
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };
}
