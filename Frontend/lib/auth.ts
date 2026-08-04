// Auth is cookie-based: the backend sets HttpOnly access_token/refresh_token
// cookies on login, refresh, and the OAuth callback response, so the browser
// sends them automatically on every request (see lib/api.ts's
// `withCredentials: true`). Nothing here ever touches localStorage — an XSS
// bug can no longer read the tokens out of it.

import { apiClient } from './api';

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Cookies are httpOnly and the access token expires on its own even if
    // this call fails — still safe to treat the user as logged out locally.
  }
}
