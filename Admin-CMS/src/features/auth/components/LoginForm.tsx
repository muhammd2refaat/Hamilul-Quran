/**
 * Login form component
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@/shared/components';
import { loginSchema, type LoginFormData } from '../schemas';
import { useAuthStore } from '../store';

interface LoginFormProps {
  onSuccess?: () => void;
  onTwoFactorRequired?: () => void;
}

export function LoginForm({ onSuccess, onTwoFactorRequired }: LoginFormProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data);

      if (result.requiresTwoFactor) {
        toast.success('Please enter your 2FA code');
        onTwoFactorRequired?.();
      } else {
        toast.success('Login successful');
        onSuccess?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-medium text-gray-800">{t('auth.welcomeBack')}</h2>
        <p className="text-gray-500 mt-2 font-light">{t('auth.journey')}</p>
      </div>

      <Input
        label={t('auth.emailAddress')}
        type="email"
        placeholder="admin@platform.com"
        leftAddon={<Mail className="h-4 w-4" />}
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label={t('auth.password')}
        type={showPassword ? 'text' : 'password'}
        placeholder={t('auth.passwordPlaceholder')}
        leftAddon={<Lock className="h-4 w-4" />}
        rightAddon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ms-2 text-sm text-gray-600">{t('auth.rememberMe')}</span>
        </label>
        <a
          href="/forgot-password"
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          {t('auth.forgotPassword')}
        </a>
      </div>

      <Button
        type="submit"
        fullWidth
        isLoading={isLoading}
        leftIcon={<LogIn className="h-4 w-4" />}
      >
        {t('auth.signIn')}
      </Button>

      <p className="text-center text-xs text-gray-500">
        {t('auth.terms')}
      </p>
    </form>
  );
}

export default LoginForm;
