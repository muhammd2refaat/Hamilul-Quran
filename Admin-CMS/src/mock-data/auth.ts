/**
 * Mock data for authentication module
 */

import type { Session } from '@/shared/types';

export interface Admin {
  id: string;
  name: string;
  email: string;
  password: string; // In real app, this would be hashed
  role: 'Super Admin' | 'Content Admin' | 'Viewer';
  avatar?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLogin?: string;
}

export const mockAdmin: Admin = {
  id: '1',
  name: 'Ahmed Hassan',
  email: 'admin@qrkareem.com',
  password: 'Admin@123456',
  role: 'Super Admin',
  twoFactorEnabled: false,
  createdAt: '2024-01-15T10:00:00Z',
  lastLogin: '2026-01-06T23:00:00Z',
};

export const mockSessions: Session[] = [
  {
    id: 'session-1',
    device: 'Chrome on Windows',
    location: 'Cairo, Egypt',
    ipAddress: '156.200.xxx.xxx',
    lastActive: '2026-01-06T23:45:00Z',
    current: true,
    createdAt: '2026-01-06T08:00:00Z',
  },
  {
    id: 'session-2',
    device: 'Safari on iPhone',
    location: 'Cairo, Egypt',
    ipAddress: '156.200.xxx.xxx',
    lastActive: '2026-01-06T20:30:00Z',
    current: false,
    createdAt: '2026-01-05T14:00:00Z',
  },
  {
    id: 'session-3',
    device: 'Firefox on macOS',
    location: 'Alexandria, Egypt',
    ipAddress: '156.201.xxx.xxx',
    lastActive: '2026-01-05T18:15:00Z',
    current: false,
    createdAt: '2026-01-04T09:30:00Z',
  },
];

export const mockAdmins: Admin[] = [
  {
    id: '1',
    name: 'Ahmed Hassan',
    email: 'admin@qrkareem.com',
    password: 'Admin@123456',
    role: 'Super Admin',
    twoFactorEnabled: false,
    createdAt: '2024-01-10T08:00:00Z',
    lastLogin: '2026-01-06T23:00:00Z',
  },
  {
    id: '2',
    name: 'Layla Mohammed',
    email: 'layla@qrkareem.com',
    password: 'Content@123',
    role: 'Content Admin',
    twoFactorEnabled: false,
    createdAt: '2024-03-22T10:15:00Z',
    lastLogin: '2026-01-06T18:30:00Z',
  },
  {
    id: '3',
    name: 'Omar Al-Fayed',
    email: 'omar@qrkareem.com',
    password: 'Content@456',
    role: 'Content Admin',
    twoFactorEnabled: false,
    createdAt: '2024-06-15T14:30:00Z',
    lastLogin: '2026-01-05T09:00:00Z',
  },
  {
    id: '4',
    name: 'Sara Abdullah',
    email: 'sara@qrkareem.com',
    password: 'Viewer@789',
    role: 'Viewer',
    twoFactorEnabled: false,
    createdAt: '2024-09-01T11:00:00Z',
    lastLogin: '2026-01-04T16:45:00Z',
  },
];
