/**
 * Mock data for Admins module
 */

import type { Admin } from '../features/admins/types';

export const mockAdminUsers: Admin[] = [
  {
    id: 'admin-1',
    name: 'Ahmed Hassan',
    email: 'admin@qrkareem.com',
    role: 'Super Admin',
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'admin-2',
    name: 'Sarah Mohammed',
    email: 'sarah@qrkareem.com',
    role: 'Admin',
    status: 'active',
    createdAt: '2025-03-20T14:30:00Z',
  },
  {
    id: 'admin-3',
    name: 'Omar Ali',
    email: 'omar@qrkareem.com',
    role: 'Admin',
    status: 'inactive',
    createdAt: '2025-06-10T09:15:00Z',
  },
  {
    id: 'admin-4',
    name: 'Fatima Abdullah',
    email: 'fatima@qrkareem.com',
    role: 'Admin',
    status: 'active',
    createdAt: '2025-08-05T11:00:00Z',
  },
];
