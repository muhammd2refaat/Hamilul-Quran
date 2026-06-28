/**
 * Login page — modern split-screen design
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  BookOpen,
  Star,
  Users,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { loginSchema, type LoginFormData } from '../schemas';
import { useAuthStore } from '../store';
import { TwoFactorVerify, PasswordResetRequest } from '../components';

type AuthView = 'login' | '2fa' | 'forgot-password';

// ─── Stats shown on the left panel ───────────────────────────────────────────

const STATS = [
  { icon: Users, value: '1,200+', label: 'Active Students' },
  { icon: BookOpen, value: '340+', label: 'Sessions Completed' },
  { icon: Star, value: '4.9', label: 'Avg Teacher Rating' },
];

const FEATURES = [
  'Manage student subscriptions & allocations',
  'Track session scores and teacher feedback',
  'Handle complaints and requests in real time',
  'Full analytics dashboard',
];

// ─── Left branding panel ──────────────────────────────────────────────────────

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 flex-col justify-between p-12 text-white">
      {/* Decorative circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
      <div className="absolute top-1/3 -right-16 w-64 h-64 rounded-full bg-indigo-500/20" />
      <div className="absolute -bottom-16 left-1/4 w-72 h-72 rounded-full bg-primary-600/30" />
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <span className="text-white font-extrabold text-lg tracking-tight">QR</span>
          </div>
          <div>
            <p className="font-bold text-lg leading-none">Quran Kareem</p>
            <p className="text-primary-300 text-xs mt-0.5">Admin Portal</p>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold leading-tight mb-4">
          Manage your<br />
          <span className="text-primary-300">Quran</span> platform<br />
          with ease.
        </h1>
        <p className="text-primary-200 text-base leading-relaxed max-w-sm">
          A complete admin system for overseeing teachers, students, sessions, and subscriptions.
        </p>
      </div>

      {/* Feature list */}
      <div className="relative z-10 space-y-3">
        {FEATURES.map((f) => (
          <div key={f} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-3 w-3 text-emerald-400" />
            </div>
            <span className="text-sm text-primary-100">{f}</span>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="relative z-10 grid grid-cols-3 gap-3 pt-8 border-t border-white/10">
        {STATS.map(({ icon: Icon, value, label }) => (
          <div key={label} className="text-center">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-2 border border-white/15">
              <Icon className="h-4 w-4 text-primary-200" />
            </div>
            <p className="text-lg font-extrabold">{value}</p>
            <p className="text-xs text-primary-300 leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Login Form Panel ─────────────────────────────────────────────────────────

function LoginFormPanel({
  onSuccess,
  onTwoFactorRequired,
  onForgotPassword,
}: {
  onSuccess: () => void;
  onTwoFactorRequired: () => void;
  onForgotPassword: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data);
      if (result.requiresTwoFactor) {
        toast.success('Please enter your 2FA code');
        onTwoFactorRequired();
      } else {
        toast.success('Welcome back!');
        onSuccess();
      }
    } catch {
      // Error already toasted by the store
    }
  };

  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-md">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">QR</span>
          </div>
          <div>
            <p className="font-bold text-gray-900">Quran Kareem</p>
            <p className="text-gray-400 text-xs">Admin Portal</p>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Welcome back</h2>
          <p className="text-gray-500 mt-2 text-sm">Sign in to your admin account to continue.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 pointer-events-none h-[18px] w-[18px]" />
              <input
                type="email"
                placeholder="admin@qrkareem.com"
                {...register('email')}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white transition-all
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none h-[18px] w-[18px]" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                {...register('password')}
                className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm bg-white transition-all
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">Keep me signed in</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl
              bg-primary-600 hover:bg-primary-700 active:scale-[0.98]
              text-white font-semibold text-sm
              transition-all duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
              shadow-md shadow-primary-200"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign In
                <ArrowRight className="h-4 w-4 ml-auto opacity-60" />
              </>
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Protected admin portal · Quran Kareem Platform © 2025
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const [view, setView] = useState<AuthView>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const { requiresTwoFactor } = useAuthStore();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleLoginSuccess = () => {
    if (requiresTwoFactor) setView('2fa');
    else navigate(from, { replace: true });
  };

  const handle2FASuccess = () => navigate(from, { replace: true });

  if (view === '2fa') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <TwoFactorVerify onSuccess={handle2FASuccess} onBack={() => setView('login')} />
      </div>
    );
  }

  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <PasswordResetRequest onBack={() => setView('login')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <BrandPanel />
      <LoginFormPanel
        onSuccess={handleLoginSuccess}
        onTwoFactorRequired={() => setView('2fa')}
        onForgotPassword={() => setView('forgot-password')}
      />
    </div>
  );
}

export default LoginPage;
