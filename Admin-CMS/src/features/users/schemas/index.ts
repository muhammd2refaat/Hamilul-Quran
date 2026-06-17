/**
 * User form validation schemas
 */

import { z } from 'zod';

export const userCreateSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{7,14}$/.test(val),
      'Invalid phone number format'
    ),
  country: z
    .string()
    .min(1, 'Country is required'),
  organizationId: z
    .string()
    .optional(),
  role: z.enum(['user', 'moderator', 'organization_admin'], {
    required_error: 'Role is required',
  }),
  sendInvite: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .optional(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{7,14}$/.test(val),
      'Invalid phone number format'
    ),
  country: z.string().optional(),
  organizationId: z.string().optional(),
  role: z.enum(['user', 'moderator', 'organization_admin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
});

export const userFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
  role: z.enum(['user', 'moderator', 'organization_admin']).optional(),
  organization: z.string().optional(),
  country: z.string().optional(),
  emailVerified: z.boolean().optional(),
  minPoints: z.number().optional(),
  maxPoints: z.number().optional(),
  registeredFrom: z.string().optional(),
  registeredTo: z.string().optional(),
});

export const userBulkActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'suspend', 'delete', 'export']),
  userIds: z.array(z.string()).min(1, 'Select at least one user'),
});

export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
export type UserFilterFormData = z.infer<typeof userFilterSchema>;
export type UserBulkActionFormData = z.infer<typeof userBulkActionSchema>;
