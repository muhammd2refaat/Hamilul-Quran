/**
 * Remembers where a signed-out visitor was heading — today only the tracked
 * /join/<allocation> links from calendar invites — so sign-in can send them
 * back there instead of to the dashboard. Restricted to /join/ paths so it
 * can never become an open redirect.
 */
const KEY = 'elhafazah_return_to';

export function rememberReturnTo(path: string): void {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Storage unavailable (private mode) — sign-in just lands on the dashboard.
  }
}

export function takeReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return value && value.startsWith('/join/') ? value : null;
  } catch {
    return null;
  }
}
