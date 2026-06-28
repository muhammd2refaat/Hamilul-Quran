/**
 * Authentication types
 */

import type { Session, AdminRole } from '@/shared/types';

/** Backend role values from /auth/me */
export type BackendRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface Admin {
  id: string;
  name: string;
  email: string;
  /** Backend role: ADMIN | TEACHER | STUDENT */
  role: AdminRole;
  backendRole: BackendRole;
  is_active: boolean;
  avatar?: string;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  requiresTwoFactor: boolean;
  token?: string;
  refreshToken?: string;
  user?: Admin;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: Admin | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresTwoFactor: boolean;
  sessions: Session[];
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  verify2FA: (code: string) => Promise<void>;
  setup2FA: () => Promise<TwoFactorSetupResponse>;
  disable2FA: (code: string) => Promise<void>;
  logout: (sessionId?: string) => Promise<void>;
  logoutAllSessions: () => Promise<void>;
  refreshAuthToken: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (data: PasswordReset) => Promise<void>;
  fetchSessions: () => Promise<void>;
  setUser: (user: Admin | null) => void;
  clearAuth: () => void;
}
