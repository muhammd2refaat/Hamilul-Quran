/**
 * Authentication validation schemas
 */

import { z } from 'zod';
import { AUTH } from '@/shared/constants';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const twoFactorSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
});

export type TwoFactorFormData = z.infer<typeof twoFactorSchema>;

export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
});

export type PasswordResetRequestFormData = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`)
      .regex(
        AUTH.PASSWORD_PATTERN,
        'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`)
      .regex(
        AUTH.PASSWORD_PATTERN,
        'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'
      ),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const adminCreateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  role: z.enum(['Super Admin', 'Content Admin', 'Viewer'], {
    required_error: 'Role is required',
  }),
  password: z
    .string()
    .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`)
    .regex(
      AUTH.PASSWORD_PATTERN,
      'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'
    ),
});

export type AdminCreateFormData = z.infer<typeof adminCreateSchema>;

// Two-factor setup schema with backup code confirmation
export const twoFactorSetupSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
  backupCodesConfirmed: z.boolean().refine((val) => val === true, {
    message: 'You must confirm you have saved your backup codes',
  }),
});

export type TwoFactorSetupFormData = z.infer<typeof twoFactorSetupSchema>;

// Password reset schema with token
export const passwordResetWithTokenSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`)
      .regex(
        AUTH.PASSWORD_PATTERN,
        'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type PasswordResetWithTokenFormData = z.infer<typeof passwordResetWithTokenSchema>;