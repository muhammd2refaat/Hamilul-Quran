'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { rememberReturnTo, takeReturnTo } from '@/lib/returnTo';
import { EE, STAR_PATTERN } from '@/lib/dashboard/theme';

type Lang = 'en' | 'ar';
type State = 'opening' | 'not_open' | 'no_meet_link' | 'forbidden' | 'error';

const COPY: Record<Lang, Record<State | 'title' | 'dashboard', string>> = {
  en: {
    title: 'Your lesson',
    opening: 'Recording your attendance and opening Google Meet…',
    not_open: 'This lesson isn’t open right now. You can join from 15 minutes before it starts until it ends.',
    no_meet_link: 'This lesson doesn’t have a Google Meet link yet. Please contact the academy.',
    forbidden: 'This lesson isn’t on the account you’re signed in with. Sign out and sign in with the account that received the invitation.',
    error: 'Couldn’t open the lesson. Please try again, or join from your dashboard.',
    dashboard: 'Go to my dashboard',
  },
  ar: {
    title: 'حلقتك',
    opening: 'جارٍ تسجيل حضورك وفتح Google Meet…',
    not_open: 'هذه الحلقة غير متاحة الآن. يمكنك الانضمام قبل موعدها بـ 15 دقيقة وحتى انتهائها.',
    no_meet_link: 'لا يوجد رابط Google Meet لهذه الحلقة بعد. يرجى التواصل مع الأكاديمية.',
    forbidden: 'هذه الحلقة ليست على الحساب الذي سجّلت الدخول به. سجّل الخروج ثم ادخل بالحساب الذي وصلته الدعوة.',
    error: 'تعذّر فتح الحلقة. حاول مرة أخرى، أو انضم من لوحة التحكم.',
    dashboard: 'الذهاب إلى لوحة التحكم',
  },
};

/**
 * Target of the "join here" link in every Google Calendar invite. Joining
 * through this page records attendance before handing over to Google Meet,
 * so joining from a calendar app counts the same as the dashboard Join
 * button. Signed-out visitors are sent to /login by the API client and
 * brought back here afterwards (lib/returnTo).
 */
export default function JoinLessonPage() {
  const { allocationId } = useParams<{ allocationId: string }>();
  const [state, setState] = useState<State>('opening');
  const [dashboardHref, setDashboardHref] = useState('/login');
  // Server render is always English; the client switches to the visitor's
  // saved dashboard language without a hydration mismatch.
  const lang = useSyncExternalStore<Lang>(
    () => () => {},
    () => {
      try {
        return localStorage.getItem('elhafazah_lang') === 'ar' ? 'ar' : 'en';
      } catch {
        return 'en';
      }
    },
    () => 'en',
  );

  useEffect(() => {
    rememberReturnTo(`/join/${allocationId}`);
    apiClient
      .post<{ recorded: boolean; meet_link: string | null; reason: string | null }>(
        `/sessions/attendance/join/${allocationId}`
      )
      .then(({ data }) => {
        takeReturnTo();
        if (data.recorded && data.meet_link) {
          window.location.replace(data.meet_link);
        } else {
          setState(data.reason === 'no_meet_link' ? 'no_meet_link' : 'not_open');
          findDashboard();
        }
      })
      .catch((err) => {
        // 401 is handled by the API client (redirect to /login, keeping the
        // return path); anything else is shown here.
        if (err?.response?.status === 401) return;
        takeReturnTo();
        setState(err?.response?.status === 403 || err?.response?.status === 404 ? 'forbidden' : 'error');
        findDashboard();
      });

    function findDashboard() {
      apiClient
        .get<{ role: string }>('/users/me')
        .then(({ data }) => {
          if (data.role === 'TEACHER') setDashboardHref('/dashboard/teacher');
          else if (data.role === 'STUDENT') setDashboardHref('/dashboard/student');
        })
        .catch(() => {});
    }
  }, [allocationId]);

  const t = COPY[lang];
  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh', background: EE.emerald, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 24, fontFamily: EE.fontBody, position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: STAR_PATTERN, backgroundSize: '70px 70px' }} />
      <div
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, background: EE.parchment,
          borderRadius: 20, padding: '34px 30px', boxShadow: '0 40px 80px rgba(8,30,22,.5)', textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 52, height: 52, margin: '0 auto 18px', border: `1.5px solid ${EE.gold}`, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(217,180,95,.12)',
          }}
        >
          <span style={{ fontFamily: EE.fontArabicDisplay, color: EE.goldDeep, fontSize: 30, fontWeight: 700, lineHeight: 1 }}>ح</span>
        </div>
        <h1 style={{ fontFamily: EE.fontHead, fontSize: 22, fontWeight: 600, color: EE.ink, margin: '0 0 12px' }}>{t.title}</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: EE.sageMuted, margin: '0 0 22px' }}>
          {state === 'opening' && (
            <Loader2 size={16} className="animate-spin" style={{ display: 'inline', verticalAlign: '-3px', marginInlineEnd: 8 }} />
          )}
          {t[state]}
        </p>
        {state !== 'opening' && (
          <Link
            href={dashboardHref}
            style={{
              display: 'inline-block', background: EE.emerald, color: EE.parchment, padding: '12px 22px',
              borderRadius: 10, fontWeight: 600, fontSize: 14.5, textDecoration: 'none',
            }}
          >
            {t.dashboard}
          </Link>
        )}
      </div>
    </div>
  );
}
