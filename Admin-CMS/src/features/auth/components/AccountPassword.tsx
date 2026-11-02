/**
 * Admin password screens:
 *  - ChangePasswordForm — current + new password (account menu, and the
 *    forced change after signing in with a temporary password)
 *  - ForcePasswordChange — full-page gate shown until that change is done
 *  - ForgotPassword — emailed 6-digit code, then a new password
 */
import { useState } from 'react';
import { KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button, Input } from '@/shared/components';
import { useAuthStore } from '../store';

/** Same rule as the backend: 10+ characters, letters and numbers. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10 || !/[A-Za-z؀-ۿ]/.test(pw) || !/\d/.test(pw)) return 'account.passwordRule';
  return null;
}

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
  return data?.message || data?.detail || fallback;
}

function NewPasswordFields({
  value,
  confirm,
  onChange,
  onConfirm,
}: {
  value: string;
  confirm: string;
  onChange: (v: string) => void;
  onConfirm: (v: string) => void;
}) {
  const { t } = useTranslation();
  const problem = value ? passwordProblem(value) : null;
  return (
    <>
      <Input
        label={t('account.newPassword')}
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={problem ? t(problem) : undefined}
        helperText={problem ? undefined : t('account.passwordRule')}
        required
      />
      <Input
        label={t('account.confirmPassword')}
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => onConfirm(e.target.value)}
        error={confirm && confirm !== value ? t('account.passwordsDontMatch') : undefined}
        required
      />
    </>
  );
}

export function ChangePasswordForm({ onDone, submitLabel }: { onDone: () => void; submitLabel?: string }) {
  const { t } = useTranslation();
  const changePassword = useAuthStore((s) => s.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = current && !passwordProblem(next) && next === confirm && next !== current;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      toast.success(t('account.passwordChanged'));
      onDone();
    } catch (err) {
      setError(errorMessage(err, t('account.changeFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input
        label={t('account.currentPassword')}
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        required
      />
      <NewPasswordFields value={next} confirm={confirm} onChange={setNext} onConfirm={setConfirm} />
      {next && next === current && <p className="text-xs text-red-600">{t('account.sameAsCurrent')}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">{t('account.signsOutOthers')}</p>
      <Button type="submit" fullWidth isLoading={saving} disabled={!valid}>
        {submitLabel ?? t('account.changePassword')}
      </Button>
    </form>
  );
}

export function ForcePasswordChange() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
          <ShieldCheck className="h-6 w-6 text-primary-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{t('account.setYourPassword')}</h1>
        <p className="text-sm text-gray-600 mt-1 mb-6">{t('account.setYourPasswordDesc', { email: user?.email })}</p>
        <ChangePasswordForm onDone={() => window.location.assign('/')} submitLabel={t('account.saveAndContinue')} />
        <button
          type="button"
          onClick={async () => {
            await logout();
            window.location.assign('/auth/login');
          }}
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-800"
        >
          {t('nav.logout')}
        </button>
      </div>
    </div>
  );
}

export function ForgotPassword({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { requestResetCode, confirmResetCode } = useAuthStore();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setBusy(true);
    setError(null);
    try {
      await requestResetCode(email.trim());
      setStep('code');
      toast.success(t('account.codeSentToast'));
    } catch (err) {
      setError(errorMessage(err, t('account.tryAgainLater')));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code) || passwordProblem(next) || next !== confirm) return;
    setBusy(true);
    setError(null);
    try {
      await confirmResetCode(email.trim(), code, next);
      toast.success(t('account.passwordResetDone'));
      onBack();
    } catch (err) {
      setError(errorMessage(err, t('account.invalidCode')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
      <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
        <KeyRound className="h-6 w-6 text-primary-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">{t('account.forgotTitle')}</h1>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4 mt-1" noValidate>
          <p className="text-sm text-gray-600 mb-5">{t('account.forgotDesc')}</p>
          <Input
            label={t('common.email')}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftAddon={<Mail className="h-4 w-4" />}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" fullWidth isLoading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)}>
            {t('account.sendCode')}
          </Button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4 mt-1" noValidate>
          <p className="text-sm text-gray-600 mb-5">{t('account.codeSentDesc', { minutes: 10 })}</p>
          <Input
            label={t('account.code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            leftAddon={<Lock className="h-4 w-4" />}
            className="tracking-[0.4em] font-mono"
            required
          />
          <NewPasswordFields value={next} confirm={confirm} onChange={setNext} onConfirm={setConfirm} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            fullWidth
            isLoading={busy}
            disabled={!/^\d{6}$/.test(code) || !!passwordProblem(next) || next !== confirm}
          >
            {t('account.resetPassword')}
          </Button>
          <button type="button" onClick={() => sendCode()} disabled={busy} className="w-full text-sm text-primary-600 hover:text-primary-700">
            {t('account.resendCode')}
          </button>
        </form>
      )}

      <button type="button" onClick={onBack} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-800">
        {t('account.backToLogin')}
      </button>
    </div>
  );
}
