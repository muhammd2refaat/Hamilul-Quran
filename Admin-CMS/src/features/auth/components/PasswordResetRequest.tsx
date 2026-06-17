/**
 * Password reset request component
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@/shared/components';
import { passwordResetRequestSchema, type PasswordResetRequestFormData } from '../schemas';

interface PasswordResetRequestProps {
  onBack?: () => void;
}

export function PasswordResetRequest({ onBack }: PasswordResetRequestProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestFormData>({
    resolver: zodResolver(passwordResetRequestSchema),
  });

  const onSubmit = async (data: PasswordResetRequestFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-success-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check Your Email</h1>
          <p className="text-gray-600 mt-2">
            We've sent password reset instructions to
          </p>
          <p className="font-medium text-gray-900 mt-1">{submittedEmail}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-left">
          <p className="text-sm text-gray-600">
            The email contains a link that will expire in 1 hour. If you don't see the email,
            check your spam folder or request a new link.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => {
            setIsSubmitted(false);
            setSubmittedEmail('');
          }}
        >
          Resend Email
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
        <p className="text-gray-600 mt-2">
          Enter your email address and we'll send you instructions to reset your password.
        </p>
      </div>

      <Input
        label="Email Address"
        type="email"
        autoComplete="email"
        placeholder="admin@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Button type="submit" fullWidth isLoading={isLoading}>
        Send Reset Link
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>
      </div>
    </form>
  );
}

export default PasswordResetRequest;
