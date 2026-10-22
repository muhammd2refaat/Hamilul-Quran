'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarCheck, CalendarPlus, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useLang } from '@/lib/dashboard/i18n';
import { EE } from '@/lib/dashboard/theme';

type Outcome = 'connected' | 'denied' | 'wrong_account' | 'error';
const OUTCOMES: Outcome[] = ['connected', 'denied', 'wrong_account', 'error'];

function parseOutcome(value: string | null): Outcome | null {
  return value && (OUTCOMES as string[]).includes(value) ? (value as Outcome) : null;
}

/**
 * One-time "Connect Google Calendar" prompt for teachers.
 *
 * Sign-in only asks Google for basic identity (so nobody sees the unverified
 * app warning there); lesson events need the teacher's Calendar grant, which
 * is requested here instead. Hidden once connected. The backend redirects
 * back with ?calendar=<outcome>, shown once and then stripped from the URL.
 */
export function CalendarConnectCard() {
  const { t } = useLang();
  const [connected, setConnected] = useState<boolean | null>(null);
  const searchParams = useSearchParams();
  // Captured once on mount, so the message survives the URL cleanup below.
  const [outcome] = useState<Outcome | null>(() => parseOutcome(searchParams.get('calendar')));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ connected: boolean }>('/calendar/connection')
      .then(({ data }) => {
        if (!cancelled) setConnected(data.connected);
      })
      .catch(() => {
        // Unknown state — show nothing rather than a misleading prompt.
      });

    // Strip ?calendar= so a refresh doesn't replay the message.
    const params = new URLSearchParams(window.location.search);
    if (params.has('calendar')) {
      params.delete('calendar');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
    return () => {
      cancelled = true;
    };
  }, []);

  async function connect() {
    setBusy(true);
    try {
      // A plain API call first: the axios interceptor silently refreshes an
      // expired session, so the top-level navigation below arrives signed in
      // instead of landing on a bare 401 page on the API domain.
      await apiClient.get('/calendar/connection');
    } catch {
      // Navigate anyway — the backend still enforces auth.
    }
    window.location.href = `${apiClient.defaults.baseURL}/auth/google/calendar/connect`;
  }

  const message =
    outcome === 'connected' ? t.calConnected
    : outcome === 'denied' ? t.calDenied
    : outcome === 'wrong_account' ? t.calWrongAccount
    : outcome === 'error' ? t.calError
    : null;
  const ok = outcome === 'connected';

  return (
    <>
      {message && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            border: `1px solid ${ok ? 'rgba(15,122,61,.35)' : 'rgba(179,38,30,.3)'}`,
            background: ok ? 'rgba(15,122,61,.08)' : 'rgba(179,38,30,.07)',
            color: ok ? '#0F7A3D' : '#B3261E',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {ok && <CalendarCheck size={18} />}
          {message}
        </div>
      )}

      {connected === false && (
        <div
          style={{
            marginBottom: 20,
            padding: '20px 22px',
            borderRadius: 14,
            background: '#fff',
            border: `1px solid ${EE.gold}`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ fontFamily: EE.fontHead, fontSize: 17, fontWeight: 600, color: EE.ink, marginBottom: 6 }}>
              {t.calConnectTitle}
            </div>
            <p style={{ fontSize: 14, color: EE.sageMuted, lineHeight: 1.6, margin: '0 0 8px' }}>{t.calConnectDesc}</p>
            <p style={{ fontSize: 12.5, color: EE.sageFaint, lineHeight: 1.55, margin: 0 }}>{t.calConnectNote}</p>
          </div>
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: EE.emerald,
              color: EE.parchment,
              border: 'none',
              padding: '12px 20px',
              borderRadius: 10,
              fontSize: 14.5,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.75 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
            {t.calConnectBtn}
          </button>
        </div>
      )}
    </>
  );
}
