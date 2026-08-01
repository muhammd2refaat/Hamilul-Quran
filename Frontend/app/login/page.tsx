"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

import { apiClient } from '@/lib/api';
import { storeTokens } from '@/lib/auth';
import { type User, type AuthResponse } from '@/types/user';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const DARK = '#0C3326';
const GOLD = '#D9B45F';
const HERO_PATTERN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70' viewBox='0 0 70 70'><g fill='none' stroke='%23D9B45F' stroke-width='1'><path d='M35 2 L47 23 L68 35 L47 47 L35 68 L23 47 L2 35 L23 23 Z'/><circle cx='35' cy='35' r='13'/></g></svg>")`;

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Maps the backend's ?error=... redirect codes to a user-facing message.
// (`not_registered` redirects to /register/required instead of here.)
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  account_inactive: 'Your account is inactive. Please contact support.',
  google_identity_unavailable: 'Google sign-in failed. Please try again.',
};

function startGoogle(intent: 'login' | 'signup') {
  const params = new URLSearchParams({ intent });
  window.location.href = `${API_BASE}/auth/google/login?${params.toString()}`;
}

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

const inputStyle = {
  width: '100%', padding: '12px 14px',
  border: '1px solid rgba(12,51,38,.18)', borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit',
  background: '#fff', color: '#10241C',
  outline: 'none',
};
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#5C6B5F', marginBottom: 6,
};

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Surface the backend's OAuth redirect error (e.g. ?error=account_inactive)
  // once, then clean the URL so a refresh doesn't re-show it.
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (!oauthError) return;

    setError(OAUTH_ERROR_MESSAGES[oauthError] || 'Google sign-in failed. Please try again.');
    window.history.replaceState(null, '', '/login');
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setError(null);
    try {
      const { data: authData } = await apiClient.post<AuthResponse>('/auth/login', {
        email: values.email,
        password: values.password,
      });

      storeTokens(authData.access_token, authData.refresh_token);

      const { data: userProfile } = await apiClient.get<User>('/users/me');

      if (userProfile.role === 'TEACHER') {
        router.push('/dashboard/teacher');
      } else if (userProfile.role === 'STUDENT') {
        router.push('/dashboard/student');
      } else {
        setError('Unauthorized role for this portal.');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'Failed to login. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Manrope','Tajawal',sans-serif", position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .07, backgroundImage: HERO_PATTERN, backgroundSize: '70px 70px' }} />

      <div style={{ width: '100%', maxWidth: 430, position: 'relative', zIndex: 1 }}>
        <Link href="/" className="ee-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24, textDecoration: 'none' }}>
          <div style={{ width: 44, height: 44, border: `1.5px solid ${GOLD}`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(217,180,95,.1)' }}>
            <span style={{ fontFamily: "'Reem Kufi',sans-serif", color: GOLD, fontWeight: 700, lineHeight: 1, fontSize: 30 }}>ح</span>
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 19, fontWeight: 600, letterSpacing: .5, color: '#F1EBDD' }}>ELHAFAZAH</span>
        </Link>

        <div className="ee-pop" style={{ background: '#F1EBDD', borderRadius: 20, padding: '34px 34px', boxShadow: '0 40px 80px rgba(8,30,22,.5)' }}>
          <div style={{ marginBottom: 22, textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", fontSize: 24, fontWeight: 600, color: '#10241C', marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 13, color: '#7A857C' }}>Log in to continue your journey</p>
          </div>

          {error && (
            <div style={{ fontSize: 13, fontWeight: 500, color: '#B3261E', textAlign: 'center', marginBottom: 18, padding: 12, borderRadius: 8, background: 'rgba(179,38,30,.08)' }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => startGoogle('login')}
            className="ee-google"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, background: '#fff', color: '#10241C', border: '1px solid rgba(12,51,38,.2)', padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 2px 6px rgba(12,51,38,.06)', marginBottom: 18 }}
          >
            <GoogleIcon />Continue with Google
          </button>

          <div style={{ position: 'relative', marginBottom: 18 }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '100%', borderTop: '1px solid rgba(12,51,38,.14)' }} />
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <span style={{ background: '#F1EBDD', padding: '0 10px', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#9AA79B' }}>
                Or
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <label style={labelStyle} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              disabled={isLoading}
              {...register('email')}
              style={{ ...inputStyle, marginBottom: errors.email ? 6 : 14 }}
            />
            {errors.email && (
              <p style={{ fontSize: 12, color: '#B3261E', marginBottom: 14 }}>{errors.email.message}</p>
            )}

            <label style={labelStyle} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              disabled={isLoading}
              {...register('password')}
              style={{ ...inputStyle, marginBottom: errors.password ? 6 : 20 }}
            />
            {errors.password && (
              <p style={{ fontSize: 12, color: '#B3261E', marginBottom: 20 }}>{errors.password.message}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="ee-btn"
              style={{ width: '100%', background: DARK, color: '#F1EBDD', border: 'none', padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "'Space Grotesk','Reem Kufi',sans-serif", cursor: isLoading ? 'default' : 'pointer', opacity: isLoading ? .75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#7A857C', marginTop: 20 }}>
            Need an account?{' '}
            <Link href="/" style={{ color: '#B08A2E', fontWeight: 600, textDecoration: 'underline' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
