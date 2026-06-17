/**
 * Login page
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm, TwoFactorVerify, PasswordResetRequest } from '../components';
import { useAuthStore } from '../store';

type AuthView = 'login' | '2fa' | 'forgot-password';

export function LoginPage() {
  const [view, setView] = useState<AuthView>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const { requiresTwoFactor } = useAuthStore();

  // Get the redirect path from location state
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleLoginSuccess = () => {
    if (requiresTwoFactor) {
      setView('2fa');
    } else {
      navigate(from, { replace: true });
    }
  };

  const handle2FASuccess = () => {
    navigate(from, { replace: true });
  };

  const handle2FARequired = () => {
    setView('2fa');
  };

  if (view === '2fa') {
    return (
      <TwoFactorVerify
        onSuccess={handle2FASuccess}
        onBack={() => setView('login')}
      />
    );
  }

  if (view === 'forgot-password') {
    return (
      <PasswordResetRequest
        onBack={() => setView('login')}
      />
    );
  }

  return (
    <LoginForm
      onSuccess={handleLoginSuccess}
      onTwoFactorRequired={handle2FARequired}
    />
  );
}

export default LoginPage;
