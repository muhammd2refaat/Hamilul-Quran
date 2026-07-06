"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { apiClient } from '@/lib/api';
import { storeTokens } from '@/lib/auth';
import { type User, type AuthResponse } from '@/types/user';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Maps the backend's ?error=... redirect codes to a user-facing message.
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  not_registered: "You haven't signed up with this Google account yet. Please sign up first.",
  account_inactive: 'Your account is inactive. Please contact support.',
  google_identity_unavailable: 'Google sign-in failed. Please try again.',
};

function startGoogle(intent: 'login' | 'signup', role?: 'student' | 'teacher') {
  const params = new URLSearchParams({ intent });
  if (role) params.set('role', role);
  window.location.href = `${API_BASE}/auth/google/login?${params.toString()}`;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [notRegisteredEmail, setNotRegisteredEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Surface the backend's OAuth redirect error (e.g. ?error=not_registered&email=...)
  // once, then clean the URL so a refresh doesn't re-show it.
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (!oauthError) return;

    setError(OAUTH_ERROR_MESSAGES[oauthError] || 'Google sign-in failed. Please try again.');
    if (oauthError === 'not_registered') {
      setNotRegisteredEmail(searchParams.get('email'));
    }
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 text-emerald-800 mb-6">
          <BookOpen className="h-8 w-8 text-emerald-600" />
          <span className="font-bold text-3xl tracking-tight">Hamilul-Quran</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-lg border-emerald-100">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Sign in to your account</CardTitle>
            <CardDescription className="text-center">
              Sign in with Google, or use your email and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-sm font-medium text-destructive text-center mb-4 p-3 rounded-md bg-destructive/10">
                {error}
                {notRegisteredEmail && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-xs text-slate-600 font-normal">
                      Sign up with <span className="font-semibold">{notRegisteredEmail}</span> as:
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="text-xs"
                        onClick={() => startGoogle('signup', 'student')}
                      >
                        Student
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-xs"
                        onClick={() => startGoogle('signup', 'teacher')}
                      >
                        Teacher
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => startGoogle('login')}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 border border-slate-300 py-3 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors mb-4"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">Or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm font-medium text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm font-medium text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4 mt-2">
            <p className="text-sm text-slate-600">
              Need an account? <Link href="/" className="text-emerald-700 font-medium underline">Sign up</Link>
            </p>
          </CardFooter>
        </Card>
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
