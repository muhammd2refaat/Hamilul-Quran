"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { storeTokens } from '@/lib/auth';

/**
 * Landing page for the backend Google OAuth redirect (existing-user login).
 * The backend returns tokens in the URL fragment so they never hit server logs:
 *   /auth/callback#access_token=...&refresh_token=...&role=STUDENT
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const role = params.get('role');

    if (!accessToken || !role) {
      setError('Sign-in failed. Please try again.');
      return;
    }

    storeTokens(accessToken, refreshToken);
    // Strip tokens from the address bar.
    window.history.replaceState(null, '', '/auth/callback');

    if (role === 'TEACHER') router.replace('/dashboard/teacher');
    else if (role === 'STUDENT') router.replace('/dashboard/student');
    else router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-emerald-800">
      {error ? (
        <>
          <p className="text-destructive font-medium">{error}</p>
          <a href="/login" className="text-emerald-600 underline">Back to login</a>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-slate-600">Signing you in…</p>
        </>
      )}
    </div>
  );
}
