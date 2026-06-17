/**
 * Two-factor authentication setup component with QR code
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@/shared/components';
import { twoFactorSetupSchema, type TwoFactorSetupFormData } from '../schemas';
import { useAuthStore } from '../store';

interface TwoFactorSetupProps {
  onSuccess?: () => void;
  onSkip?: () => void;
}

interface SetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

export function TwoFactorSetup({ onSuccess, onSkip }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const { user, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorSetupFormData>({
    resolver: zodResolver(twoFactorSetupSchema),
    defaultValues: {
      code: '',
      backupCodesConfirmed: false,
    },
  });

  useEffect(() => {
    // Generate mock setup data
    const generateSecret = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let secret = '';
      for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return secret;
    };

    const generateBackupCodes = () => {
      const codes: string[] = [];
      for (let i = 0; i < 8; i++) {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase() +
          '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        codes.push(code);
      }
      return codes;
    };

    const secret = generateSecret();
    const issuer = 'QV Admin Panel';
    const email = user?.email || 'admin@example.com';

    // Generate a placeholder QR code URL (in real app, use a QR code library)
    const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    setSetupData({
      qrCodeUrl,
      secret,
      backupCodes: generateBackupCodes(),
    });
  }, [user?.email]);

  const handleCopySecret = async () => {
    if (setupData) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      toast.success('Secret copied to clipboard');
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = async () => {
    if (setupData) {
      await navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedBackup(true);
      toast.success('Backup codes copied to clipboard');
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  const onVerify = async (data: TwoFactorSetupFormData) => {
    try {
      // In real app, verify the code against the secret
      // For demo, accept any 6-digit code
      if (data.code.length === 6) {
        setStep('backup');
        toast.success('2FA setup verified successfully');
      }
    } catch (error) {
      toast.error('Invalid verification code');
    }
  };

  const handleComplete = () => {
    toast.success('Two-factor authentication enabled');
    onSuccess?.();
  };

  if (!setupData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set Up Two-Factor Authentication</h1>
        <p className="text-gray-600 mt-2">
          Add an extra layer of security to your account
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2 mb-8">
        {['setup', 'verify', 'backup'].map((s, i) => (
          <div
            key={s}
            className={`h-2 w-16 rounded-full ${
              step === s
                ? 'bg-primary-600'
                : i < ['setup', 'verify', 'backup'].indexOf(step)
                ? 'bg-primary-300'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {step === 'setup' && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with your authenticator app
            </p>
            <div className="inline-block p-4 bg-white border rounded-lg">
              <img
                src={setupData.qrCodeUrl}
                alt="QR Code for 2FA setup"
                className="w-48 h-48"
              />
            </div>
          </div>

          <div className="relative">
            <p className="text-sm text-gray-600 mb-2 text-center">
              Or enter this secret key manually:
            </p>
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
              <code className="flex-1 text-sm font-mono text-center break-all">
                {setupData.secret}
              </code>
              <button
                type="button"
                onClick={handleCopySecret}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                aria-label="Copy secret"
              >
                {copiedSecret ? (
                  <Check className="h-4 w-4 text-success-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            {onSkip && (
              <Button type="button" variant="outline" fullWidth onClick={onSkip}>
                Skip for Now
              </Button>
            )}
            <Button type="button" fullWidth onClick={() => setStep('verify')}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <form onSubmit={handleSubmit(onVerify)} className="space-y-6">
          <p className="text-sm text-gray-600 text-center">
            Enter the 6-digit code from your authenticator app to verify setup
          </p>

          <Input
            label="Verification Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            error={errors.code?.message}
            {...register('code')}
            className="text-center text-2xl tracking-widest"
          />

          <div className="flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setStep('setup')}>
              Back
            </Button>
            <Button type="submit" fullWidth isLoading={isLoading}>
              Verify
            </Button>
          </div>
        </form>
      )}

      {step === 'backup' && (
        <div className="space-y-6">
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <p className="text-sm text-warning-800 font-medium">
              Save these backup codes in a secure location. You can use them to access your
              account if you lose your authenticator device.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Backup Codes</span>
              <button
                type="button"
                onClick={handleCopyBackupCodes}
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                {copiedBackup ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy All
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
              {setupData.backupCodes.map((code, index) => (
                <code key={index} className="text-sm font-mono text-gray-700">
                  {code}
                </code>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">
              Each backup code can only be used once. After using a code, it will be invalidated.
              You can generate new backup codes at any time from your security settings.
            </p>
          </div>

          <Button type="button" fullWidth onClick={handleComplete}>
            I've Saved My Backup Codes
          </Button>
        </div>
      )}
    </div>
  );
}

export default TwoFactorSetup;
