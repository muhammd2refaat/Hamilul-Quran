"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { EE, STAR_PATTERN } from '@/lib/dashboard/theme';
import { CountrySelect } from '@/components/auth/CountrySelect';
import type { CountryOption } from '@/lib/countries';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type Lang = 'en' | 'ar';
type IjazaValue = 'HIFZ' | 'TILAWAH' | 'HAFS_AN_ASIM' | 'TEN_QIRAAT' | 'OTHER';

const IJAZA_OPTIONS: { value: IjazaValue; en: string; ar: string }[] = [
  { value: 'HIFZ', en: 'Ijazah in Hifz', ar: 'إجازة في الحفظ' },
  { value: 'TILAWAH', en: 'Ijazah in Tilawah', ar: 'إجازة في التلاوة' },
  { value: 'HAFS_AN_ASIM', en: 'Ijazah Hafs ʿan ʿAsim', ar: 'إجازة حفص عن عاصم' },
  { value: 'TEN_QIRAAT', en: 'Ijazah in the Ten Qiraʾat', ar: 'إجازة في القراءات العشر' },
  { value: 'OTHER', en: 'Other', ar: 'أخرى' },
];

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    langToggle: 'العربية',
    completeProfileStudent: 'Complete your student profile',
    completeProfileTeacher: 'Complete your teacher profile',
    completeProfileGeneric: 'Complete your profile',
    subtitle: 'A few more details to finish setting up your account.',
    missingLink: 'Missing or invalid registration link. Please sign in with Google again.',
    backToLogin: 'Back to login',
    loading: 'Loading…',
    fullName: 'Full name',
    age: 'Age',
    countryLabel: 'Country of residence',
    countryPlaceholder: 'Select your country',
    countrySearchPlaceholder: 'Search countries…',
    countryEmpty: 'No countries found',
    countryUnavailable: "Couldn't load the country list — please try again.",
    phoneLabel: 'Phone number',
    phoneNational: '10 1234 5678',
    genderLabel: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    workedOnlineLabel: 'Have you taught online before?',
    yes: 'Yes',
    no: 'No',
    juzLabel: 'Juz memorized',
    ijazaLabel: 'Ijaza(s) held — select all that apply',
    certificateLabel: 'Upload certificate (PDF / image)',
    submit: 'Create account',
    submitting: 'Creating account…',
    genericError: 'Registration failed. Please try again.',
    countryRequired: 'Please select your country of residence.',
  },
  ar: {
    langToggle: 'English',
    completeProfileStudent: 'أكمل ملفك الشخصي كطالب',
    completeProfileTeacher: 'أكمل ملفك الشخصي كمعلم',
    completeProfileGeneric: 'أكمل ملفك الشخصي',
    subtitle: 'بعض التفاصيل الإضافية لإتمام إعداد حسابك.',
    missingLink: 'رابط التسجيل مفقود أو غير صالح. يرجى تسجيل الدخول عبر جوجل مرة أخرى.',
    backToLogin: 'العودة لتسجيل الدخول',
    loading: 'جارٍ التحميل…',
    fullName: 'الاسم الكامل',
    age: 'العمر',
    countryLabel: 'بلد الإقامة',
    countryPlaceholder: 'اختر بلدك',
    countrySearchPlaceholder: 'ابحث عن دولة…',
    countryEmpty: 'لا توجد نتائج',
    countryUnavailable: 'تعذر تحميل قائمة الدول — يرجى المحاولة مرة أخرى.',
    phoneLabel: 'رقم الهاتف',
    phoneNational: '١٠ ١٢٣٤ ٥٦٧٨',
    genderLabel: 'الجنس',
    genderMale: 'ذكر',
    genderFemale: 'أنثى',
    workedOnlineLabel: 'هل درّست عبر الإنترنت من قبل؟',
    yes: 'نعم',
    no: 'لا',
    juzLabel: 'عدد الأجزاء المحفوظة',
    ijazaLabel: 'الإجازات الحاصل عليها — اختر كل ما ينطبق',
    certificateLabel: 'رفع الشهادة (PDF / صورة)',
    submit: 'إنشاء الحساب',
    submitting: 'جارٍ إنشاء الحساب…',
    genericError: 'فشل التسجيل. يرجى المحاولة مرة أخرى.',
    countryRequired: 'يرجى اختيار بلد الإقامة.',
  },
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: EE.sageMuted, marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  border: `1px solid ${EE.border}`, borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit',
  background: '#fff', color: EE.ink, outline: 'none',
};

export default function CompleteRegistrationPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('en');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const s = STRINGS[lang];

  const [regToken, setRegToken] = useState<string | null>(null);
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  // A static/permanent condition (bad or missing link params) — kept as a
  // flag rather than baked-in translated text so toggling the language
  // afterward still shows the right copy. Transient errors from a submit
  // attempt (below) are fine as plain strings since they're re-set fresh
  // in the language active at that moment.
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Shared
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  // Student
  const [country, setCountry] = useState<CountryOption | null>(null);
  const [phoneNational, setPhoneNational] = useState('');
  const [gender, setGender] = useState('MALE');
  // Teacher
  const [workedOnline, setWorkedOnline] = useState('false');
  const [juz, setJuz] = useState('');
  const [ijazas, setIjazas] = useState<IjazaValue[]>([]);
  const [certificate, setCertificate] = useState<File | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('registration_token');
    const r = params.get('role');
    if (!token || (r !== 'student' && r !== 'teacher')) {
      setLinkInvalid(true);
      return;
    }
    setRegToken(token);
    setRole(r);
  }, []);

  function toggleIjaza(value: IjazaValue) {
    setIjazas((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!regToken || !role) return;
    if (role === 'student' && !country) {
      setError(s.countryRequired);
      return;
    }
    setIsLoading(true);
    setError(null);

    const form = new FormData();
    form.set('registration_token', regToken);
    form.set('full_name', fullName);
    if (age) form.set('age', age);

    if (role === 'student') {
      // English name always — Admin-CMS's country filter (and this data in
      // general) is English-first regardless of which language the student
      // filled the form in.
      form.set('country', country!.name);
      const fullPhone = `${country!.dialCode} ${phoneNational.trim()}`.trim();
      form.set('phone_number', fullPhone);
      form.set('gender', gender);
    } else {
      form.set('worked_online_before', workedOnline);
      if (juz) form.set('juz_memorized', juz);
      ijazas.forEach((v) => form.append('ijazas', v));
      if (certificate) form.set('certificate', certificate);
    }

    try {
      const res = await fetch(`${API_BASE}/auth/google/complete-registration`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || s.genericError);
      }
      router.replace(role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : s.genericError);
    } finally {
      setIsLoading(false);
    }
  }

  const title =
    role === 'student' ? s.completeProfileStudent : role === 'teacher' ? s.completeProfileTeacher : s.completeProfileGeneric;

  return (
    <div
      dir={dir}
      style={{
        minHeight: '100vh',
        background: EE.emerald,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: EE.fontBody,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: STAR_PATTERN, backgroundSize: '70px 70px' }} />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div
              style={{
                width: 44, height: 44, border: `1.5px solid ${EE.gold}`, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(217,180,95,.1)',
              }}
            >
              <span style={{ fontFamily: EE.fontArabicDisplay, color: EE.gold, fontWeight: 700, lineHeight: 1, fontSize: 30 }}>ح</span>
            </div>
            <span style={{ fontFamily: EE.fontHead, fontSize: 19, fontWeight: 600, letterSpacing: 0.5, color: EE.parchment }}>
              {lang === 'ar' ? 'الحفظة' : 'ELHAFAZAH'}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}
            style={{
              background: 'transparent', border: `1px solid rgba(241,235,221,.35)`, color: EE.parchment,
              borderRadius: 999, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {s.langToggle}
          </button>
        </div>

        <div style={{ background: EE.parchment, borderRadius: 20, padding: '34px 34px', boxShadow: '0 40px 80px rgba(8,30,22,.5)' }}>
          {!role ? (
            <div style={{ textAlign: 'center', fontSize: 14, color: '#B3261E', padding: '24px 0' }}>
              {linkInvalid ? s.missingLink : s.loading}
              <div style={{ marginTop: 16 }}>
                <a href="/login" style={{ color: EE.goldDeep, fontWeight: 600, textDecoration: 'underline' }}>
                  {s.backToLogin}
                </a>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 22, textAlign: 'center' }}>
                <h1 style={{ fontFamily: EE.fontHead, fontSize: 24, fontWeight: 600, color: EE.ink, marginBottom: 6 }}>{title}</h1>
                <p style={{ fontSize: 13, color: EE.sageFaint }}>{s.subtitle}</p>
              </div>

              {error && (
                <div style={{ fontSize: 13, fontWeight: 500, color: '#B3261E', textAlign: 'center', marginBottom: 18, padding: 12, borderRadius: 8, background: 'rgba(179,38,30,.08)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle} htmlFor="fullName">{s.fullName}</label>
                  <input id="fullName" style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={isLoading} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle} htmlFor="age">{s.age}</label>
                  <input id="age" type="number" min={1} style={inputStyle} value={age} onChange={(e) => setAge(e.target.value)} required disabled={isLoading} />
                </div>

                {role === 'student' && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle} htmlFor="country">{s.countryLabel}</label>
                      <CountrySelect
                        id="country"
                        lang={lang}
                        value={country}
                        onChange={setCountry}
                        placeholder={s.countryPlaceholder}
                        searchPlaceholder={s.countrySearchPlaceholder}
                        emptyLabel={s.countryEmpty}
                        disabled={isLoading}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle} htmlFor="phone">{s.phoneLabel}</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div
                          style={{
                            flexShrink: 0, minWidth: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0 10px', border: `1px solid ${EE.border}`, borderRadius: 8, fontSize: 14,
                            fontWeight: 600, color: country ? EE.ink : EE.sageFaint, background: '#fff',
                          }}
                        >
                          {country?.dialCode || '+--'}
                        </div>
                        <input
                          id="phone"
                          type="tel"
                          placeholder={s.phoneNational}
                          style={{ ...inputStyle, flex: 1 }}
                          value={phoneNational}
                          onChange={(e) => setPhoneNational(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle} htmlFor="gender">{s.genderLabel}</label>
                      <select id="gender" style={{ ...inputStyle, height: 42 }} value={gender} onChange={(e) => setGender(e.target.value)} disabled={isLoading}>
                        <option value="MALE">{s.genderMale}</option>
                        <option value="FEMALE">{s.genderFemale}</option>
                      </select>
                    </div>
                  </>
                )}

                {role === 'teacher' && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle} htmlFor="workedOnline">{s.workedOnlineLabel}</label>
                      <select id="workedOnline" style={{ ...inputStyle, height: 42 }} value={workedOnline} onChange={(e) => setWorkedOnline(e.target.value)} disabled={isLoading}>
                        <option value="true">{s.yes}</option>
                        <option value="false">{s.no}</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle} htmlFor="juz">{s.juzLabel}</label>
                      <input id="juz" type="number" min={0} max={30} style={inputStyle} value={juz} onChange={(e) => setJuz(e.target.value)} disabled={isLoading} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>{s.ijazaLabel}</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {IJAZA_OPTIONS.map((opt) => (
                          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: EE.ink }}>
                            <input type="checkbox" checked={ijazas.includes(opt.value)} onChange={() => toggleIjaza(opt.value)} disabled={isLoading} />
                            {lang === 'ar' ? opt.ar : opt.en}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle} htmlFor="certificate">{s.certificateLabel}</label>
                      <input
                        id="certificate"
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        style={{ ...inputStyle, padding: '9px 14px' }}
                        onChange={(e) => setCertificate(e.target.files?.[0] ?? null)}
                        disabled={isLoading}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%', background: EE.emerald, color: EE.parchment, border: 'none', padding: 14,
                    borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: EE.fontHead,
                    cursor: isLoading ? 'default' : 'pointer', opacity: isLoading ? 0.75 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {s.submitting}
                    </>
                  ) : (
                    s.submit
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
