// Shared FAQ copy for the landing page — kept in its own plain (non
// 'use client') module so both the client component (on-screen accordion)
// and the server page components (FAQPage JSON-LD in app/page.tsx and
// app/ar/page.tsx) can import the same data. Importing a named export like
// this directly out of a 'use client' file into a server component isn't
// reliably supported by the RSC bundler — it works in dev but breaks at
// runtime in production builds.
export const faqsData = [
  {
    qEn: 'Is the free trial class really free?', qAr: 'هل الحصة التجريبية مجانية فعلاً؟',
    aEn: 'Yes. The first session is completely free with no card required — you\'ll be matched with a certified teacher and recite Qur\'an in that very first class.',
    aAr: 'نعم، الحصة الأولى مجانية تمامًا ودون أي بطاقة دفع — سنختار لك معلّمًا مجازًا وستتلو القرآن في نفس الحصة الأولى.',
  },
  {
    qEn: 'What ages do you teach, and is it for beginners too?', qAr: 'ما الأعمار التي تقبلونها، وهل تناسب المبتدئين؟',
    aEn: 'We teach children (from age 5) and adults, from absolute beginners starting with Noorani Qaida through to advanced Hifz and ijazah students.',
    aAr: 'نُدرّس الأطفال (من عمر ٥ سنوات) والكبار، من المبتدئين تمامًا بدءًا بالقاعدة النورانية وحتى طلاب الحفظ المتقدّم والإجازة.',
  },
  {
    qEn: 'Can I learn Tajweed and Hifz (Qur\'an memorization) fully online?', qAr: 'هل يمكن تعلّم التجويد وحفظ القرآن أونلاين بالكامل؟',
    aEn: 'Yes — all classes are live, one-on-one video sessions, with structured revision cycles and progress tracking so memorization stays on schedule.',
    aAr: 'نعم، كل الحصص مباشرة وفردية عبر الفيديو، مع دورات مراجعة منظّمة ومتابعة للتقدّم لضمان استمرار الحفظ في موعده.',
  },
  {
    qEn: 'Are the teachers certified / ijazah holders?', qAr: 'هل المعلّمون مجازون؟',
    aEn: 'Every teacher is certified, and both male and female teachers are available so you can be matched appropriately.',
    aAr: 'كل معلّمينا مجازون، ويتوفّر معلّمون ومعلّمات لضمان اختيار الأنسب لك.',
  },
  {
    qEn: 'How flexible is the class schedule across time zones?', qAr: 'ما مدى مرونة مواعيد الحصص عبر المناطق الزمنية؟',
    aEn: 'Fully flexible — we have students and teachers across 40+ countries, and sessions are scheduled around your availability, not a fixed time zone.',
    aAr: 'مرنة تمامًا — لدينا طلاب ومعلّمون في أكثر من ٤٠ دولة، وتُحدَّد الحصص وفق أوقاتك المتاحة وليس منطقة زمنية ثابتة.',
  },
];
