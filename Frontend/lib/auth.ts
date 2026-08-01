// Centralized token storage for both password login and Google OAuth flows.

const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
const cookieFlags = `path=/; max-age=86400; SameSite=Strict${isSecure ? '; Secure' : ''}`;

export function storeTokens(accessToken: string, refreshToken?: string | null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', accessToken);
  document.cookie = `access_token=${accessToken}; ${cookieFlags}`;
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  document.cookie = `access_token=; path=/; max-age=0; SameSite=Strict${isSecure ? '; Secure' : ''}`;
}

