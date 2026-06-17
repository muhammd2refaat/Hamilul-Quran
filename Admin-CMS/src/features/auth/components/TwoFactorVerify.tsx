/**
 * Two-factor authentication verification component
 */

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/shared/components';
import { twoFactorSchema, type TwoFactorFormData } from '../schemas';
import { useAuthStore } from '../store';

interface TwoFactorVerifyProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export function TwoFactorVerify({ onSuccess, onBack }: TwoFactorVerifyProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verify2FA, isLoading } = useAuthStore();

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  });

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Update form value
    const fullCode = newCode.join('');
    setValue('code', fullCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = pastedData.split('').slice(0, 6);
    while (newCode.length < 6) newCode.push('');
    setCode(newCode);
    setValue('code', pastedData);

    // Focus last filled input or first empty one
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const onSubmit = async (data: TwoFactorFormData) => {
    try {
      await verify2FA(data.code);
      toast.success('Verification successful');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed');
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      setValue('code', '');
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h1>
        <p className="text-gray-600 mt-2">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-2xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      {errors.code && (
        <p className="text-center text-sm text-danger-600">{errors.code.message}</p>
      )}

      <Button
        type="submit"
        fullWidth
        isLoading={isLoading}
        disabled={code.join('').length !== 6}
      >
        Verify
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

      <p className="text-center text-xs text-gray-500">
        Lost access to your authenticator? Contact your administrator for help.
      </p>
    </form>
  );
}

export default TwoFactorVerify;
