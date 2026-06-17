/**
 * Auth feature barrel export
 */

// Components
export { 
  LoginForm, 
  TwoFactorVerify, 
  TwoFactorSetup, 
  PasswordResetRequest, 
  PasswordResetForm, 
  SessionManager 
} from './components';

// Store
export { useAuthStore } from './store';

// Types (export with different names to avoid conflicts)
export type { 
  Admin, 
  LoginCredentials, 
  LoginResponse, 
  TwoFactorSetupResponse,
  PasswordReset,
  AuthState, 
  AuthActions 
} from './types';
export type { PasswordResetRequest as PasswordResetRequestData } from './types';

// Schemas
export * from './schemas';
