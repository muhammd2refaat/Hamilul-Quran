"use client";

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const DARK = '#0C3326';
const GOLD = '#D9B45F';

const HERO_PATTERN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70' viewBox='0 0 70 70'><g fill='none' stroke='%23D9B45F' stroke-width='1'><path d='M35 2 L47 23 L68 35 L47 47 L35 68 L23 47 L2 35 L23 23 Z'/><circle cx='35' cy='35' r='13'/></g></svg>")`;

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.9 6.2C12.2 13.6 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-3.9 6.7-9.7 6.7-17.4z" />
      <path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C.9 16.4 0 20.1 0 24s.9 7.6 2.5 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.4 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.4 0-11.8-4.1-13.6-9.9l-7.9 6.2C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}

// Landing page for the backend's `not_registered` OAuth redirect — the Google
// account authenticated fine but no local user exists yet for it.
export default function RegisterRequiredPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email'));
  }, []);

  function startGoogleSignup(role: 'student' | 'teacher') {
    const params = new URLSearchParams({ intent: 'signup', role });
    window.location.href = `${API_BASE}/auth/google/login?${params.toString()}`;
  }

  return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Manrope','Tajawal',sans-serif", position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .07, backgroundImage: HERO_PATTERN, backgroundSize: '70px 70px' }} />

      <div className="ee-pop" style={{ width: '100%', maxWidth: 460, background: '#F1EBDD', borderRadius: 20, padding: '40px 36px', position: 'relative', zIndex: 1, boxShadow: '0 40px 80px rgba(8,30,22,.5)', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, margin: '0 auto 20px', border: `1.5px solid ${GOLD}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(217,180,95,.12)' }}>
          <span style={{ fontFamily: "'Reem Kufi',sans-serif", color: '#B08A2E', fontSize: 32, fontWeight: 700, lineHeight: 1 }}>ح</span>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 26, fontWeight: 600, color: '#10241C', marginBottom: 10, letterSpacing: -0.3 }}>
          You need to register first
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5C6B5F', marginBottom: 28 }}>
          {email ? (
            <>We couldn&apos;t find an account for <span style={{ fontWeight: 700, color: '#10241C' }}>{email}</span>. Sign up below to create one — it only takes a moment.</>
          ) : (
            <>We couldn&apos;t find an account for that Google sign-in. Sign up below to create one.</>
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
          <button
            onClick={() => startGoogleSignup('student')}
            className="ee-google"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, background: '#fff', color: '#10241C', border: '1px solid rgba(12,51,38,.2)', padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 2px 6px rgba(12,51,38,.06)' }}
          >
            <GoogleIcon />Sign up as Student
          </button>
          <button
            onClick={() => startGoogleSignup('teacher')}
            className="ee-google"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, background: '#fff', color: '#10241C', border: '1px solid rgba(12,51,38,.2)', padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 2px 6px rgba(12,51,38,.06)' }}
          >
            <GoogleIcon />Sign up as Teacher
          </button>
        </div>

        <a href="/login" style={{ fontSize: 13.5, fontWeight: 600, color: '#5C6B5F', textDecoration: 'underline' }}>
          Already have a different account? Back to login
        </a>
      </div>
    </div>
  );
}
