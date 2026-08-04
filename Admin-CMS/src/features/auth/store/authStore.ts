/**
 * Authentication store using Zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthState, AuthActions, LoginCredentials, LoginResponse, TwoFactorSetupResponse } from '../types';
import type { AdminRole } from '@/shared/types';
import { post, get } from '@/services/api/client';
import toast from 'react-hot-toast';

interface AuthStore extends AuthState, AuthActions {}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  requiresTwoFactor: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, getStore) => ({
      ...initialState,

      login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        set({ isLoading: true });

        try {
          // Step 1: Exchange credentials for tokens
          const tokenResponse = await post<{
            access_token: string;
            refresh_token: string;
            token_type: string;
            expires_in: number;
          }>('/auth/login', credentials);

          const { access_token, refresh_token } = tokenResponse;
          // Auth cookies (HttpOnly access_token/refresh_token) were already
          // set by the backend on this same response — apiClient's
          // withCredentials sends them automatically from here on. The
          // values below are kept in memory only, never persisted.

          // Step 2: Fetch real user profile from backend
          const me = await get<{ id: string; email: string; role: string; is_active: boolean }>(
            '/auth/me'
          );

          // This is the admin CMS — only ADMIN-role accounts may use it.
          if (me.role !== 'ADMIN') {
            const msg = 'This account does not have admin access.';
            toast.error(msg);
            const guardError: any = new Error(msg);
            guardError.isAdminGuard = true;
            throw guardError;
          }

          // Map backend role → CMS AdminRole display name
          const roleMap: Record<string, AdminRole> = {
            ADMIN: 'Super Admin',
            TEACHER: 'Content Admin',
            STUDENT: 'Viewer',
          };

          const user = {
            id: String(me.id),
            email: me.email,
            name: me.email.split('@')[0],
            role: roleMap[me.role] ?? ('Viewer' as AdminRole),
            backendRole: me.role,
            is_active: me.is_active,
            twoFactorEnabled: false,
          } as import('../types').Admin;

          set({
            user,
            token: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
            requiresTwoFactor: false,
          });

          return { success: true, requiresTwoFactor: false, token: access_token, user };

        } catch (error: any) {
          set({ isLoading: false });

          // Already toasted with the correct message above — just propagate.
          if (error?.isAdminGuard) {
            throw error;
          }

          const status = error?.response?.status;
          const detail = error?.response?.data?.detail || error?.response?.data?.message;

          if (status === 401 || status === 400) {
            const msg = detail || 'Invalid email or password';
            toast.error(msg);
            throw new Error(msg);
          }

          if (!error?.response) {
            const msg = 'Cannot reach the server. Please ensure the backend is running.';
            toast.error(msg);
            throw new Error(msg);
          }

          toast.error(detail || 'Login failed. Please try again.');
          throw error;
        }
      },

      verify2FA: async (code: string): Promise<void> => {
        set({ isLoading: true });
        try {
          const response = await post<{ access_token: string; refresh_token: string; user: any }>(
            '/auth/verify-2fa',
            { code }
          );

          set({
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            requiresTwoFactor: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          toast.error('Invalid 2FA code');
          throw error;
        }
      },

      setup2FA: async (): Promise<TwoFactorSetupResponse> => {
        const response = await get<TwoFactorSetupResponse>('/auth/2fa/setup');
        return response;
      },

      disable2FA: async (code: string): Promise<void> => {
        await post('/auth/2fa/disable', { code });
      },

      logout: async (): Promise<void> => {
        try {
          // refresh_token cookie is sent automatically — nothing to pass.
          await post('/auth/logout');
        } catch {
          // Ignore backend errors — still clear local session
        } finally {
          set(initialState);
        }
      },

      logoutAllSessions: async (): Promise<void> => {
        try {
          await post('/auth/logout');
        } catch {
          // Ignore
        } finally {
          set(initialState);
        }
      },

      refreshAuthToken: async (): Promise<void> => {
        try {
          const response = await post<{ access_token: string }>('/auth/refresh');
          set({ token: response.access_token });
        } catch (error) {
          getStore().clearAuth();
          throw error;
        }
      },

      requestPasswordReset: async (email: string): Promise<void> => {
        await post('/auth/request-password-reset', { email });
      },

      resetPassword: async (data: any): Promise<void> => {
        await post('/auth/reset-password', data);
      },

      setUser: (user) => set({ user }),

      clearAuth: () => {
        set(initialState);
      },
    }),
    {
      name: 'qv_auth_store',
      storage: createJSONStorage(() => localStorage),
      // token/refreshToken are deliberately excluded — real auth is the
      // HttpOnly cookie the backend set; persisting the raw JWT here would
      // put it right back within reach of an XSS bug.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
