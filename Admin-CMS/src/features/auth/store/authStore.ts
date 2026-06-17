/**
 * Authentication store using Zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mockAdmin, mockSessions } from '@/mock-data/auth';
import type { AuthState, AuthActions, LoginCredentials, LoginResponse, TwoFactorSetupResponse } from '../types';
import { STORAGE_KEYS } from '@/shared/constants';
import { sleep } from '@/shared/utils';

interface AuthStore extends AuthState, AuthActions {}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  requiresTwoFactor: false,
  sessions: [],
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        set({ isLoading: true });

        try {
          // Simulate API call
          await sleep(1000);

          // Find admin by email
          const admin = mockAdmin;
          
          // Validate credentials
          if (credentials.email === admin.email && credentials.password === admin.password) {
            if (admin.twoFactorEnabled) {
              set({
                isLoading: false,
                requiresTwoFactor: true,
              });
              return { success: true, requiresTwoFactor: true };
            }

            const token = `mock-token-${Date.now()}`;
            const refreshToken = `mock-refresh-${Date.now()}`;

            set({
              user: admin,
              token,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              requiresTwoFactor: false,
            });

            return { success: true, requiresTwoFactor: false, token, user: admin };
          }

          set({ isLoading: false });
          throw new Error('Invalid email or password');
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verify2FA: async (code: string): Promise<void> => {
        set({ isLoading: true });

        try {
          await sleep(500);

          // Mock verification - accept any 6-digit code for demo
          if (code.length === 6 && /^\d+$/.test(code)) {
            const token = `mock-token-${Date.now()}`;
            const refreshToken = `mock-refresh-${Date.now()}`;

            set({
              user: mockAdmin,
              token,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              requiresTwoFactor: false,
            });
          } else {
            throw new Error('Invalid verification code');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setup2FA: async (): Promise<TwoFactorSetupResponse> => {
        await sleep(500);

        // Mock 2FA setup response
        return {
          secret: 'JBSWY3DPEHPK3PXP',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          backupCodes: [
            'ABC123DEF456',
            'GHI789JKL012',
            'MNO345PQR678',
            'STU901VWX234',
            'YZA567BCD890',
          ],
        };
      },

      disable2FA: async (code: string): Promise<void> => {
        await sleep(500);

        if (code.length !== 6) {
          throw new Error('Invalid verification code');
        }

        const user = get().user;
        if (user) {
          set({
            user: { ...user, twoFactorEnabled: false },
          });
        }
      },

      logout: async (sessionId?: string): Promise<void> => {
        set({ isLoading: true });

        try {
          await sleep(300);

          if (sessionId) {
            // Logout specific session
            const sessions = get().sessions.filter((s) => s.id !== sessionId);
            set({ sessions, isLoading: false });
          } else {
            // Full logout
            set(initialState);
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logoutAllSessions: async (): Promise<void> => {
        set({ isLoading: true });

        try {
          await sleep(500);
          set(initialState);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      refreshAuthToken: async (): Promise<void> => {
        const currentRefreshToken = get().refreshToken;
        if (!currentRefreshToken) {
          throw new Error('No refresh token available');
        }

        await sleep(300);

        const newToken = `mock-token-${Date.now()}`;
        const newRefreshToken = `mock-refresh-${Date.now()}`;

        set({
          token: newToken,
          refreshToken: newRefreshToken,
        });
      },

      requestPasswordReset: async (email: string): Promise<void> => {
        await sleep(1000);

        // Mock - always succeed for demo
        if (!email.includes('@')) {
          throw new Error('Invalid email address');
        }
      },

      resetPassword: async (): Promise<void> => {
        await sleep(1000);
        // Mock password reset
      },

      fetchSessions: async (): Promise<void> => {
        set({ isLoading: true });

        try {
          await sleep(500);
          set({ sessions: mockSessions, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setUser: (user) => {
        set({ user });
      },

      clearAuth: () => {
        set(initialState);
      },
    }),
    {
      name: STORAGE_KEYS.AUTH_TOKEN,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
