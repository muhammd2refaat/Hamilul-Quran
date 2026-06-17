/**
 * Password reset form component (after clicking reset link)
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@/shared/components';
import { passwordResetWithTokenSchema, type PasswordResetWithTokenFormData } from '../schemas';

interface PasswordResetFormProps {
  token: string;
  onSuccess?: () => void;
  onExpired?: () => void;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(p) },
];

export function PasswordResetForm({ token, onSuccess, onExpired }: PasswordResetFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordResetWithTokenFormData>({
    resolver: zodResolver(passwordResetWithTokenSchema),
    defaultValues: {
      token,
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password') || '';

  const onSubmit = async (data: PasswordResetWithTokenFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call - check if token is valid
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate token expiration (for demo, token starting with 'expired' is expired)
      if (data.token.startsWith('expired')) {
        setIsTokenExpired(true);
        onExpired?.();
        return;
      }

      setIsSuccess(true);
      toast.success('Password reset successfully');
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (error) {
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isTokenExpired) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-danger-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Link Expired</h1>
          <p className="text-gray-600 mt-2">
            This password reset link has expired. Please request a new one.
          </p>
        </div>
        <Button type="button" fullWidth onClick={onExpired}>
          Request New Link
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-success-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Password Reset Complete</h1>
          <p className="text-gray-600 mt-2">
            Your password has been successfully reset. Redirecting to login...
          </p>
        </div>
        <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Password</h1>
        <p className="text-gray-600 mt-2">
          Please enter your new password below.
        </p>
      </div>

      <input type="hidden" {...register('token')} />

      <div className="relative">
        <Input
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      {/* Password requirements checklist */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-gray-700">Password requirements:</p>
        {passwordRequirements.map((req, index) => {
          const isValid = req.test(password);
          return (
            <div
              key={index}
              className={`flex items-center gap-2 text-sm ${
                isValid ? 'text-success-600' : 'text-gray-500'
              }`}
            >
              {isValid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {req.label}
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Input
          label="Confirm New Password"
          type={showConfirmPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
        >
          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      <Button type="submit" fullWidth isLoading={isLoading}>
        Reset Password
      </Button>

      <p className="text-center text-xs text-gray-500">
        After resetting your password, all existing sessions will be terminated.
      </p>
    </form>
  );
}

export default PasswordResetForm;
