/**
 * User management module types
 */

import type { PaginatedResponse } from '@/shared/types';
import type { User } from '@/mock-data/users';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type UserRole = 'user' | 'moderator' | 'organization_admin';

// Re-export User type from mock-data for consistency
export type { User } from '@/mock-data/users';

export interface UserPreferences {
  language: 'en' | 'ar';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  timezone: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'quiz' | 'article' | 'webinar' | 'story' | 'product' | 'badge' | 'login' | 'profile_update';
  action: string;
  target?: string;
  points?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface UserFilterParams {
  search?: string;
  status?: UserStatus;
  role?: UserRole;
  organization?: string;
  country?: string;
  emailVerified?: boolean;
  minPoints?: number;
  maxPoints?: number;
  registeredFrom?: string;
  registeredTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserCreateInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  organizationId?: string;
  role: UserRole;
  sendInvite: boolean;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  organizationId?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserBulkAction {
  action: 'activate' | 'deactivate' | 'suspend' | 'delete' | 'export';
  userIds: string[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  byStatus: Record<UserStatus, number>;
  byCountry: Array<{ country: string; count: number }>;
  byOrganization: Array<{ organization: string; count: number }>;
}

export type UsersResponse = PaginatedResponse<User>;
