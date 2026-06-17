/**
 * Password reset page
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { PasswordResetForm, PasswordResetRequest } from '../components';

export function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  if (token) {
    return (
      <PasswordResetForm
        token={token}
        onSuccess={() => navigate('/login')}
        onExpired={() => navigate('/reset-password')}
      />
    );
  }

  return (
    <PasswordResetRequest
      onBack={() => navigate('/login')}
    />
  );
}

export default PasswordResetPage;
