'use client';

import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Lang = 'en' | 'ar';
type AuthMode = 'login' | 'register';

// ── Translations ──────────────────────────────────────────────────────────────
const S = {
  en: {
    navPrograms: 'Programs', navMethod: 'Methodology', navTrial: 'Free trial',
    navLogin: 'Log in', navRegister: 'Register', langBtnLabel: 'العربية',
    heroBadge: 'Online · Live · 1-on-1',
    heroTitlePre: 'Memorize the Qur’an with a', heroTitleHi: 'teacher who knows your name.',
    heroVerse: '﴿ وَرَتِّلِ ٱلْقُرْآنَ تَرْتِيلًا ﴾',
    heroDesc: 'One-on-one live classes in Hifz, Tajweed, and Noorani Qaida. Personalised plans for children and adults — guided by certified instructors.',
    ctaTrial: 'Start free trial', ctaPrograms: 'View programs',
    archSub: 'Read · Recite · Retain',
    programsTitle: 'Three programs. One sacred goal.',
    programsIntro: 'Every learner follows a clear, structured path — from first letters to full memorization and ijazah.',
    methodTitle: 'How learning works',
    trialTitle: 'Your first lesson is free.',
    trialDesc: 'Book a no-commitment trial. We’ll pair you with a teacher matched to your level, goals, and schedule — and you’ll recite within your very first session.',
    fName: 'Full name', phName: 'Your name', fEmail: 'Email', fProgram: 'Program',
    fWhatsapp: 'WhatsApp number', phWhatsapp: '+1 555 000 0000',
    fMessage: 'Your message', phMessage: 'Tell us about your goals (optional)',
    trialBtn: 'Claim my free lesson',
    successTitle: 'JazakAllahu khairan!', successDesc: 'We’ll email you within 24 hours to book your free trial.',
    googleContinue: 'Continue with Google', googleSignup: 'Sign up with Google',
    loginNote: 'Sign in securely with your Google account.',
    chooseRole: 'I am joining as a…', roleStudent: 'Student', roleStudentDesc: 'I want to learn & memorize the Qur’an',
    roleTeacher: 'Teacher', roleTeacherDesc: 'I want to teach with Elhafazah',
    continueBtn: 'Continue', backBtn: 'Back', finishBtn: 'Create account',
    step2Note: 'Create your account in one tap — quick and secure. We’ll use it to set up your profile.',
    fCountry: 'Country of residence', phCountry: 'e.g. United Kingdom', fPhone: 'Phone number',
    fAge: 'Age', fGender: 'Gender', fOnline: 'Taught online before?', fQualification: 'Qualification',
    fJuz: 'How many Juz memorized?', fCertificate: 'Upload certificate', uploadHint: 'Click to upload (PDF / image)',
    footerName: 'ELHAFAZAH ACADEMY', footerTag: 'Nurturing a love for the Qur’an, one āyah at a time.',
    copyright: '© 2025 Elhafazah Academy',
  },
  ar: {
    navPrograms: 'البرامج', navMethod: 'منهجيتنا', navTrial: 'حصة تجريبية',
    navLogin: 'تسجيل الدخول', navRegister: 'إنشاء حساب', langBtnLabel: 'English',
    heroBadge: 'أونلاين · مباشر · فردي',
    heroTitlePre: 'احفظ القرآن الكريم مع', heroTitleHi: 'معلّمٍ يعرفك باسمك.',
    heroVerse: '﴿ وَرَتِّلِ ٱلْقُرْآنَ تَرْتِيلًا ﴾',
    heroDesc: 'حصص مباشرة فردية في الحفظ والتجويد والقاعدة النورانية. خطط مخصّصة للأطفال والكبار على يد معلّمين مجازين.',
    ctaTrial: 'ابدأ حصة مجانية', ctaPrograms: 'تصفّح البرامج',
    archSub: 'اقرأ · رتّل · احفظ',
    programsTitle: 'ثلاثة برامج. هدفٌ واحد.',
    programsIntro: 'يسير كل طالب على مسار واضح ومنظّم — من أوّل الحروف إلى الحفظ الكامل والإجازة.',
    methodTitle: 'كيف تسير الدراسة',
    trialTitle: 'حصّتك الأولى مجانية.',
    trialDesc: 'احجز حصة تجريبية دون أي التزام. سنختار لك معلّمًا يناسب مستواك وأهدافك وجدولك — وستتلو القرآن منذ حصّتك الأولى.',
    fName: 'الاسم الكامل', phName: 'اسمك', fEmail: 'البريد الإلكتروني', fProgram: 'البرنامج',
    fWhatsapp: 'رقم الواتساب', phWhatsapp: '‫+٢٠ ١٠٠ ٠٠٠ ٠٠٠٠‬',
    fMessage: 'رسالتك', phMessage: 'أخبرنا عن أهدافك (اختياري)',
    trialBtn: 'احجز حصتي المجانية',
    successTitle: 'جزاك الله خيرًا!', successDesc: 'سنراسلك خلال ٢٤ ساعة لحجز حصتك التجريبية.',
    googleContinue: 'المتابعة عبر جوجل', googleSignup: 'التسجيل عبر جوجل',
    loginNote: 'سجّل الدخول بأمان عبر حساب جوجل الخاص بك.',
    chooseRole: 'أنضمّ بصفتي…', roleStudent: 'طالب', roleStudentDesc: 'أريد أن أتعلّم وأحفظ القرآن',
    roleTeacher: 'معلّم', roleTeacherDesc: 'أريد أن أُعلّم مع الحفظة',
    continueBtn: 'متابعة', backBtn: 'رجوع', finishBtn: 'إنشاء الحساب',
    step2Note: 'أنشئ حسابك بنقرة واحدة — بسرعة وأمان. سنستخدمه لإعداد ملفك الشخصي.',
    fCountry: 'بلد الإقامة', phCountry: 'مثال: المملكة المتحدة', fPhone: 'رقم الهاتف',
    fAge: 'العمر', fGender: 'الجنس', fOnline: 'هل علّمت أونلاين من قبل؟', fQualification: 'المؤهّل',
    fJuz: 'كم جزءًا حفظت؟', fCertificate: 'رفع الشهادة', uploadHint: 'اضغط للرفع (PDF / صورة)',
    footerName: 'أكاديمية الحفظة', footerTag: 'نغرس حبّ القرآن، آيةً بعد آية.',
    copyright: '© ٢٠٢٥ أكاديمية الحفظة',
  },
} as const;

// ── Static data ───────────────────────────────────────────────────────────────
const programsData = [
  { n: 1, ar: 'النورانية', en: 'Noorani Qaida', arName: 'القاعدة النورانية',
    descEn: 'Master the Arabic letters, their sounds and joins — the confident foundation for reading the Mushaf.',
    descAr: 'إتقان الحروف العربية وأصواتها ووصلها — الأساس المتين لقراءة المصحف.',
    levelEn: 'BEGINNERS · AGES 5+', levelAr: 'للمبتدئين · من عمر ٥+',
    bg: '#0C3326', fg: '#F1EBDD', accent: '#D9B45F' },
  { n: 2, ar: 'التجويد', en: 'Tajweed', arName: 'التجويد',
    descEn: 'Perfect the rules of recitation — makharij, ghunnah, madd — so every verse is recited as revealed.',
    descAr: 'إتقان أحكام التلاوة — المخارج والغنّة والمدّ — لتُتلى كل آية كما أُنزلت.',
    levelEn: 'INTERMEDIATE · ALL AGES', levelAr: 'متوسط · لكل الأعمار',
    bg: '#15463A', fg: '#F1EBDD', accent: '#D9B45F' },
  { n: 3, ar: 'الحفظ', en: 'Hifz', arName: 'الحفظ',
    descEn: 'A structured memorization journey with revision cycles, progress tracking and an ijazah pathway.',
    descAr: 'رحلة حفظ منظّمة مع دورات للمراجعة ومتابعة للتقدّم ومسار للإجازة.',
    levelEn: 'COMMITTED LEARNERS', levelAr: 'للطلاب الملتزمين',
    bg: '#D9B45F', fg: '#10241C', accent: '#0C3326' },
];

const stepsData = [
  { n: '01', tEn: 'Book your free trial', tAr: 'احجز حصتك المجانية',
    dEn: 'Share your goals and availability — it takes under two minutes.', dAr: 'أخبرنا بأهدافك وأوقاتك — لا يستغرق الأمر دقيقتين.' },
  { n: '02', tEn: 'Get matched', tAr: 'اختيار معلّمك',
    dEn: 'We pair you with a certified teacher suited to your level and pace.', dAr: 'نختار لك معلّمًا مجازًا يناسب مستواك وسرعتك.' },
  { n: '03', tEn: 'Learn live, one-on-one', tAr: 'تعلّم مباشر وفردي',
    dEn: 'Weekly personalised sessions over video, fully focused on you.', dAr: 'حصص أسبوعية مخصّصة عبر الفيديو، مركّزة عليك بالكامل.' },
  { n: '04', tEn: 'Track & revise', tAr: 'تابِع وراجِع',
    dEn: 'Clear milestones and structured revision keep your progress steady.', dAr: 'أهداف واضحة ومراجعة منظّمة تحافظ على ثبات تقدّمك.' },
];

const statsData = [
  { num: '2,400+', en: 'students worldwide', ar: 'طالب حول العالم' },
  { num: '120+',   en: 'certified teachers',  ar: 'معلّم مجاز' },
  { num: '40+',    en: 'countries',            ar: 'دولة' },
  { num: '4.9★',   en: 'avg. rating',          ar: 'متوسط التقييم' },
];

const perksData = [
  { en: 'No card required — completely free', ar: 'دون بطاقة — مجانية تمامًا' },
  { en: 'Flexible scheduling across time zones',   ar: 'مواعيد مرنة عبر كل المناطق الزمنية' },
  { en: 'Male & female teachers available',        ar: 'معلّمون ومعلّمات متاحون' },
];

// ── Google SVG ─────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.9 6.2C12.2 13.6 17.6 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-3.9 6.7-9.7 6.7-17.4z"/>
      <path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C.9 16.4 0 20.1 0 24s.9 7.6 2.5 10.8l7.9-6.2z"/>
      <path fill="#34A853" d="M24 48c6.4 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.4 0-11.8-4.1-13.6-9.9l-7.9 6.2C6.4 42.6 14.6 48 24 48z"/>
    </svg>
  );
}

// ── Geometric pattern SVGs ────────────────────────────────────────────────────
const HERO_PATTERN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70' viewBox='0 0 70 70'><g fill='none' stroke='%23D9B45F' stroke-width='1'><path d='M35 2 L47 23 L68 35 L47 47 L35 68 L23 47 L2 35 L23 23 Z'/><circle cx='35' cy='35' r='13'/></g></svg>")`;
const ARCH_PATTERN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><g fill='none' stroke='%23D9B45F' stroke-width='1'><path d='M28 2 L38 18 L54 28 L38 38 L28 54 L18 38 L2 28 L18 18 Z'/></g></svg>")`;

// ─────────────────────────────────────────────────────────────────────────────
export default function EelhafazahPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [program, setProgram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [message, setMessage] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [regStep, setRegStep] = useState(1);
  const [role, setRole] = useState<'' | 'student' | 'teacher'>('');

  const t = S[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const programs = programsData.map(p => ({
    ...p,
    name: lang === 'ar' ? p.arName : p.en,
    desc: lang === 'ar' ? p.descAr : p.descEn,
    level: lang === 'ar' ? p.levelAr : p.levelEn,
  }));

  const steps = stepsData.map(s => ({
    n: s.n,
    title: lang === 'ar' ? s.tAr : s.tEn,
    desc: lang === 'ar' ? s.dAr : s.dEn,
  }));

  const stats = statsData.map(s => ({ num: s.num, label: lang === 'ar' ? s.ar : s.en }));
  const perks = perksData.map(p => ({ t: lang === 'ar' ? p.ar : p.en }));

  const programOptions = lang === 'ar'
    ? ['القاعدة النورانية', 'التجويد', 'الحفظ — تحفيظ']
    : ['Noorani Qaida', 'Tajweed', 'Hifz — Memorization'];

  const genderOptions = lang === 'ar' ? ['ذكر', 'أنثى'] : ['Male', 'Female'];
  const yesNoOptions = lang === 'ar' ? ['نعم', 'لا'] : ['Yes', 'No'];
  const qualOptions = lang === 'ar'
    ? ['إجازة في الحفظ', 'إجازة في التلاوة', 'إجازة حفص عن عاصم', 'إجازة القراءات العشر', 'لا، ليس لديّ']
    : ['Ijazah in Hifz', 'Ijazah in Tilawah', 'Ijazah Hafs ʿan ʿAsim', 'Ijazah in the Ten Qiraʾat', "No, I don't have one"];
  const juzOptions = Array.from({ length: 30 }, (_, i) => String(i + 1));

  const isLogin = authMode === 'login';
  const authHeading = lang === 'ar'
    ? (isLogin ? 'مرحبًا بعودتك' : 'أنشئ حسابك')
    : (isLogin ? 'Welcome back' : 'Create your account');
  const authSubheading = isLogin
    ? (lang === 'ar' ? 'سجّل الدخول لمتابعة رحلتك' : 'Log in to continue your journey')
    : (lang === 'ar' ? `الخطوة ${regStep} من ٣` : `Step ${regStep} of 3`);

  const GOLD = '#D9B45F';
  const DARK = '#0C3326';

  function openLogin() { setAuthOpen(true); setAuthMode('login'); }
  function openRegister() { setAuthOpen(true); setAuthMode('register'); setRegStep(1); setRole(''); }
  function closeAuth() { setAuthOpen(false); }
  function nextStep() { if (regStep === 1 && !role) return; setRegStep(Math.min(3, regStep + 1)); }
  function prevStep() { setRegStep(Math.max(1, regStep - 1)); }

  // ── Input style ──────────────────────────────────────────────────────────
  const inputDark: React.CSSProperties = {
    width: '100%', padding: '13px 14px',
    border: '1px solid rgba(185,203,188,.3)', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit',
    background: 'rgba(255,255,255,.05)', color: '#F1EBDD',
    marginBottom: 16, outline: 'none',
  };
  const inputLight: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: '1px solid rgba(12,51,38,.18)', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit',
    background: '#fff', color: '#10241C',
    marginBottom: 13, outline: 'none',
  };
  const labelDark: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#9DB5A0', marginBottom: 6,
    letterSpacing: 1, textTransform: 'uppercase',
  };
  const labelLight: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: '#5C6B5F', marginBottom: 6,
  };

  return (
    <div dir={dir} style={{ fontFamily: "'Manrope','Tajawal',sans-serif", color: '#10241C', background: '#F1EBDD', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <header style={{ background: DARK, position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '22px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 46, height: 46, border: '1.5px solid #D9B45F', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(217,180,95,.1)' }}>
              <span style={{ fontFamily: "'Reem Kufi',sans-serif", color: '#D9B45F', fontWeight: 700, lineHeight: 1, display: 'block', fontSize: 35 }}>ح</span>
            </div>
            <div style={{ lineHeight: 1.12 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 19, fontWeight: 600, letterSpacing: .5, color: '#F1EBDD' }}>ELHAFAZAH</div>
              <div style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 12, color: '#9DB5A0', letterSpacing: 1 }}>أكاديمية الحفظة</div>
            </div>
          </div>
          {/* Nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 14, fontWeight: 500, color: '#B9CBBC' }}>
            <a href="#programs" style={{ color: 'inherit', textDecoration: 'none' }}>{t.navPrograms}</a>
            <a href="#how" style={{ color: 'inherit', textDecoration: 'none' }}>{t.navMethod}</a>
            <a href="#trial" style={{ color: 'inherit', textDecoration: 'none' }}>{t.navTrial}</a>
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="ee-lang"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: '1px solid rgba(185,203,188,.4)', color: '#F1EBDD', padding: '8px 14px', borderRadius: 30, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all .25s' }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D9B45F', display: 'inline-block' }} />
              {t.langBtnLabel}
            </button>
            <div style={{ width: 1, height: 24, background: 'rgba(185,203,188,.25)' }} />
            <button onClick={openLogin} className="ee-login" style={{ background: 'transparent', border: 'none', color: '#F1EBDD', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', padding: '8px 4px', transition: 'color .25s' }}>
              {t.navLogin}
            </button>
            <button onClick={openRegister} className="ee-btn" style={{ background: '#D9B45F', color: DARK, border: 'none', padding: '10px 22px', borderRadius: 6, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', transition: 'transform .25s' }}>
              {t.navRegister}
            </button>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ background: DARK, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .07, backgroundImage: HERO_PATTERN, backgroundSize: '70px 70px' }} />
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '70px 36px 90px', display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 60, alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <div className="ee-fade" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid rgba(217,180,95,.4)', color: '#D9B45F', padding: '7px 15px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              {t.heroBadge}
            </div>
            <h1 className="ee-rise-1" style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 56, fontWeight: 600, lineHeight: 1.1, color: '#F1EBDD', margin: '24px 0 12px', letterSpacing: -1 }}>
              {t.heroTitlePre} <span style={{ color: '#D9B45F' }}>{t.heroTitleHi}</span>
            </h1>
            <div className="ee-rise-2" style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 26, color: '#9DB5A0', marginBottom: 22 }}>
              {t.heroVerse}
            </div>
            <p className="ee-rise-3" style={{ maxWidth: 470, fontSize: 16.5, lineHeight: 1.7, color: '#B9CBBC', marginBottom: 34 }}>
              {t.heroDesc}
            </p>
            <div className="ee-rise-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a href="#trial" className="ee-cta" style={{ background: '#D9B45F', color: DARK, padding: '15px 30px', borderRadius: 7, fontWeight: 600, fontSize: 15, textDecoration: 'none', transition: 'transform .25s', display: 'inline-block' }}>
                {t.ctaTrial}
              </a>
              <a href="#programs" className="ee-cta2" style={{ border: '1px solid rgba(185,203,188,.4)', color: '#F1EBDD', padding: '15px 28px', borderRadius: 7, fontWeight: 600, fontSize: 15, textDecoration: 'none', transition: 'all .25s', display: 'inline-block' }}>
                {t.ctaPrograms}
              </a>
            </div>
          </div>

          {/* Arch visual */}
          <div className="ee-fade-d">
            <div style={{ aspectRatio: '4/5', borderRadius: '50% 50% 14px 14px/40% 40% 4% 4%', background: 'linear-gradient(165deg,#154634,#0A2A20)', border: '1.5px solid rgba(217,180,95,.35)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <div style={{ position: 'absolute', inset: 0, opacity: .14, backgroundImage: ARCH_PATTERN, backgroundSize: '56px 56px' }} />
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 84, color: '#D9B45F', lineHeight: 1, marginBottom: 18 }}>اقرأ</div>
                <div style={{ width: 60, height: 1, background: 'rgba(217,180,95,.5)', margin: '0 auto 18px' }} />
                <div style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 15, letterSpacing: 3, color: '#9DB5A0', textTransform: 'uppercase' }}>{t.archSub}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS MARQUEE ── */}
      <section style={{ background: '#D9B45F', color: DARK, padding: '26px 36px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, fontFamily: "'Space Grotesk','Reem Kufi',sans-serif" }}>
          {stats.map((st, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 600 }}>{st.num}</span>
              <span style={{ fontSize: 13, fontWeight: 500, opacity: .8 }}>{st.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROGRAMS ── */}
      <section id="programs" style={{ background: '#F1EBDD', padding: '96px 36px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 50 }}>
            <div>
              <div style={{ fontFamily: "'Reem Kufi',sans-serif", color: '#B08A2E', fontSize: 20, marginBottom: 6 }}>برامجنا</div>
              <h2 style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 44, fontWeight: 600, color: '#10241C', letterSpacing: -.5, lineHeight: 1.12 }}>{t.programsTitle}</h2>
            </div>
            <p style={{ maxWidth: 340, fontSize: 14.5, lineHeight: 1.6, color: '#5C6B5F' }}>{t.programsIntro}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
            {programs.map(p => (
              <div key={p.n} className="ee-card" style={{ background: p.bg, color: p.fg, borderRadius: 16, padding: '34px 30px', border: '1px solid rgba(16,36,28,.08)', position: 'relative', overflow: 'hidden', minHeight: 340, display: 'flex', flexDirection: 'column', transition: 'transform .3s' }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: 2, opacity: .6 }}>0{p.n}</div>
                <div style={{ fontFamily: "'Reem Kufi',sans-serif", fontSize: 46, margin: 'auto 0 14px', color: p.accent }}>{p.ar}</div>
                <h3 style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 25, fontWeight: 600, marginBottom: 10 }}>{p.name}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, opacity: .82, marginBottom: 18 }}>{p.desc}</p>
                <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: .5, opacity: .7, borderTop: '1px solid currentColor', paddingTop: 14 }}>{p.level}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── METHODOLOGY ── */}
      <section id="how" style={{ background: DARK, color: '#F1EBDD', padding: '96px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, border: '1px solid rgba(217,180,95,.18)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: -20, right: -20, width: 200, height: 200, border: '1px solid rgba(217,180,95,.12)', borderRadius: '50%' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: "'Reem Kufi',sans-serif", color: '#D9B45F', fontSize: 20, marginBottom: 6 }}>منهجيتنا</div>
          <h2 style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 44, fontWeight: 600, letterSpacing: -.5, marginBottom: 54 }}>{t.methodTitle}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {steps.map(s => (
              <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 2fr', gap: 30, alignItems: 'center', padding: '28px 0', borderTop: '1px solid rgba(185,203,188,.18)' }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 46, fontWeight: 600, color: '#D9B45F', opacity: .9 }}>{s.n}</div>
                <h3 style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 22, fontWeight: 600 }}>{s.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#B9CBBC' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FREE TRIAL ── */}
      <section id="trial" style={{ background: '#F1EBDD', padding: '96px 36px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 54, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Reem Kufi',sans-serif", color: '#B08A2E', fontSize: 22, marginBottom: 8 }}>ابدأ رحلتك</div>
            <h2 style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 42, fontWeight: 600, color: '#10241C', letterSpacing: -.5, lineHeight: 1.12, marginBottom: 16 }}>{t.trialTitle}</h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#5C6B5F', marginBottom: 24 }}>{t.trialDesc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {perks.map((k, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14.5, color: '#10241C', fontWeight: 500 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: DARK, color: '#D9B45F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>✓</span>
                  {k.t}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ background: DARK, borderRadius: 18, padding: 36, boxShadow: '0 30px 60px rgba(12,51,38,.3)' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '30px 6px', color: '#F1EBDD' }}>
                <div style={{ width: 58, height: 58, margin: '0 auto 16px', borderRadius: '50%', background: '#D9B45F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DARK, fontSize: 28 }}>✓</div>
                <h3 style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 24, marginBottom: 6 }}>{t.successTitle}</h3>
                <p style={{ fontSize: 14, color: '#B9CBBC' }}>{t.successDesc}</p>
              </div>
            ) : (
              <div>
                <label style={labelDark}>{t.fName}</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t.phName} style={inputDark} />
                <label style={labelDark}>{t.fEmail}</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={inputDark} />
                <label style={labelDark}>{t.fProgram}</label>
                <select value={program} onChange={e => setProgram(e.target.value)} style={{ ...inputDark, background: DARK, marginBottom: 22 }}>
                  <option value="" />
                  {programOptions.map(o => <option key={o}>{o}</option>)}
                </select>
                <label style={labelDark}>{t.fWhatsapp}</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder={t.phWhatsapp} style={inputDark} />
                <label style={labelDark}>{t.fMessage}</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t.phMessage} rows={3} style={{ ...inputDark, resize: 'vertical', marginBottom: 22 }} />
                <button onClick={() => setSubmitted(true)} className="ee-btn" style={{ width: '100%', background: '#D9B45F', color: DARK, border: 'none', padding: 14, borderRadius: 8, fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", cursor: 'pointer', transition: 'transform .2s' }}>
                  {t.trialBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0A2A20', color: '#9DB5A0', padding: '54px 36px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 44, height: 44, border: '1.5px solid #D9B45F', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Reem Kufi',sans-serif", color: '#D9B45F', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>ح</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 17, fontWeight: 600, color: '#F1EBDD', letterSpacing: .5 }}>{t.footerName}</div>
              <div style={{ fontSize: 13 }}>{t.footerTag}</div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: '#6E8472' }}>{t.copyright}</div>
        </div>
      </footer>

      {/* ── AUTH MODAL ── */}
      {authOpen && (
        <div onClick={closeAuth} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(8,30,22,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} className="ee-fade">
          <div dir={dir} onClick={e => e.stopPropagation()} className="ee-pop" style={{ width: '100%', maxWidth: 430, maxHeight: '90vh', overflowY: 'auto', background: '#F1EBDD', borderRadius: 20, padding: '34px 34px', position: 'relative', boxShadow: '0 40px 80px rgba(8,30,22,.5)' }}>
            <button onClick={closeAuth} style={{ position: 'absolute', top: 16, insetInlineEnd: 18, background: 'transparent', border: 'none', fontSize: 24, lineHeight: 1, color: '#8A958B', cursor: 'pointer', fontFamily: 'inherit', zIndex: 2 }}>×</button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, border: '1.5px solid #B08A2E', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(217,180,95,.12)', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Reem Kufi',sans-serif", color: '#B08A2E', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>ح</span>
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 18, fontWeight: 600, color: '#10241C', lineHeight: 1.2 }}>{authHeading}</div>
                <div style={{ fontSize: 12.5, color: '#7A857C' }}>{authSubheading}</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'rgba(12,51,38,.07)', borderRadius: 10, padding: 4, marginBottom: 22 }}>
              <button onClick={() => setAuthMode('login')} style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: 10, borderRadius: 7, transition: 'all .2s', background: isLogin ? DARK : 'transparent', color: isLogin ? '#F1EBDD' : '#5C6B5F' }}>
                {t.navLogin}
              </button>
              <button onClick={() => { setAuthMode('register'); setRegStep(1); }} style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: 10, borderRadius: 7, transition: 'all .2s', background: !isLogin ? DARK : 'transparent', color: !isLogin ? '#F1EBDD' : '#5C6B5F' }}>
                {t.navRegister}
              </button>
            </div>

            {/* Login tab */}
            {isLogin && (
              <div>
                <button onClick={closeAuth} className="ee-google" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, background: '#fff', color: '#10241C', border: '1px solid rgba(12,51,38,.2)', padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 2px 6px rgba(12,51,38,.06)' }}>
                  <GoogleIcon />{t.googleContinue}
                </button>
                <p style={{ textAlign: 'center', fontSize: 12.5, color: '#7A857C', marginTop: 16, lineHeight: 1.5 }}>{t.loginNote}</p>
              </div>
            )}

            {/* Register wizard */}
            {!isLogin && (
              <div>
                {/* Step dots */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
                  {[1, 2, 3].map(n => (
                    <div key={n} style={{ flex: 1, height: 5, borderRadius: 3, background: n <= regStep ? GOLD : 'rgba(12,51,38,.14)', transition: 'background .25s' }} />
                  ))}
                </div>

                {/* Step 1 — role */}
                {regStep === 1 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#5C6B5F', marginBottom: 14 }}>{t.chooseRole}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <button onClick={() => setRole('student')} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'start', background: '#fff', border: `2px solid ${role === 'student' ? GOLD : 'rgba(12,51,38,.14)'}`, borderRadius: 13, padding: 18, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
                        <span style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(12,51,38,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📖</span>
                        <span>
                          <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, color: '#10241C' }}>{t.roleStudent}</span>
                          <span style={{ display: 'block', fontSize: 13, color: '#7A857C' }}>{t.roleStudentDesc}</span>
                        </span>
                      </button>
                      <button onClick={() => setRole('teacher')} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'start', background: '#fff', border: `2px solid ${role === 'teacher' ? GOLD : 'rgba(12,51,38,.14)'}`, borderRadius: 13, padding: 18, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
                        <span style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(12,51,38,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🕌</span>
                        <span>
                          <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, color: '#10241C' }}>{t.roleTeacher}</span>
                          <span style={{ display: 'block', fontSize: 13, color: '#7A857C' }}>{t.roleTeacherDesc}</span>
                        </span>
                      </button>
                    </div>
                    <button onClick={nextStep} style={{ width: '100%', marginTop: 20, background: DARK, color: '#F1EBDD', border: 'none', padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", cursor: 'pointer', opacity: role ? 1 : .45, transition: 'all .2s' }}>
                      {t.continueBtn}
                    </button>
                  </div>
                )}

                {/* Step 2 — Google */}
                {regStep === 2 && (
                  <div>
                    <p style={{ fontSize: 13.5, color: '#5C6B5F', lineHeight: 1.6, marginBottom: 18 }}>{t.step2Note}</p>
                    <button onClick={nextStep} className="ee-google" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, background: '#fff', color: '#10241C', border: '1px solid rgba(12,51,38,.2)', padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 2px 6px rgba(12,51,38,.06)' }}>
                      <GoogleIcon />{t.googleSignup}
                    </button>
                    <button onClick={prevStep} style={{ width: '100%', marginTop: 12, background: 'transparent', color: '#5C6B5F', border: 'none', padding: 10, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.backBtn}</button>
                  </div>
                )}

                {/* Step 3 — details */}
                {regStep === 3 && (
                  <div>
                    {role === 'student' && (
                      <div>
                        <label style={labelLight}>{t.fName}</label>
                        <input placeholder={t.phName} style={inputLight} />
                        <label style={labelLight}>{t.fCountry}</label>
                        <input placeholder={t.phCountry} style={inputLight} />
                        <label style={labelLight}>{t.fPhone}</label>
                        <input placeholder="+1 555 000 0000" style={inputLight} />
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <label style={labelLight}>{t.fAge}</label>
                            <input type="number" placeholder="—" style={inputLight} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={labelLight}>{t.fGender}</label>
                            <select style={inputLight}>
                              {genderOptions.map(g => <option key={g}>{g}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {role === 'teacher' && (
                      <div>
                        <label style={labelLight}>{t.fName}</label>
                        <input placeholder={t.phName} style={inputLight} />
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <label style={labelLight}>{t.fAge}</label>
                            <input type="number" placeholder="—" style={inputLight} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={labelLight}>{t.fOnline}</label>
                            <select style={inputLight}>
                              {yesNoOptions.map(y => <option key={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>
                        <label style={labelLight}>{t.fQualification}</label>
                        <select style={inputLight}>
                          {qualOptions.map(q => <option key={q}>{q}</option>)}
                        </select>
                        <label style={labelLight}>{t.fJuz}</label>
                        <select style={inputLight}>
                          {juzOptions.map(j => <option key={j}>{j}</option>)}
                        </select>
                        <label style={labelLight}>{t.fCertificate}</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, border: '1.5px dashed rgba(12,51,38,.3)', borderRadius: 10, cursor: 'pointer', marginBottom: 18, background: 'rgba(12,51,38,.02)' }}>
                          <span style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(217,180,95,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B08A2E', fontSize: 18 }}>⬆</span>
                          <span style={{ fontSize: 13, color: '#5C6B5F' }}>{t.uploadHint}</span>
                          <input type="file" style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}

                    <button onClick={closeAuth} className="ee-btn" style={{ width: '100%', background: DARK, color: '#F1EBDD', border: 'none', padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", cursor: 'pointer', transition: 'transform .2s' }}>
                      {t.finishBtn}
                    </button>
                    <button onClick={prevStep} style={{ width: '100%', marginTop: 10, background: 'transparent', color: '#5C6B5F', border: 'none', padding: 8, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t.backBtn}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
