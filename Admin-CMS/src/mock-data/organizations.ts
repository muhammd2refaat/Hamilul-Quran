/**
 * Mock data for organizations module
 */

import type { EntityStatus, Country } from '@/shared/types';

export interface Organization {
  id: string;
  name: string;
  country: Country;
  userCount: number;
  activeUserCount: number;
  status: EntityStatus;
  totalPoints: number;
  avgPointsPerUser: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OrganizationAnalytics {
  organizationId: string;
  organizationName: string;
  totalUsers: number;
  activeUsers: number;
  totalPoints: number;
  avgPointsPerUser: number;
  articlesViewed: number;
  webinarsAttended: number;
  quizzesTaken: number;
  storiesSubmitted: number;
}

export const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Riyadh Medical Center',
    country: 'KSA',
    userCount: 342,
    activeUserCount: 315,
    status: 'active',
    totalPoints: 245670,
    avgPointsPerUser: 718,
    deletedAt: null,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2025-12-15T10:30:00Z',
  },
  {
    id: 'org-2',
    name: 'Dubai Healthcare City',
    country: 'UAE',
    userCount: 198,
    activeUserCount: 187,
    status: 'active',
    totalPoints: 156890,
    avgPointsPerUser: 792,
    deletedAt: null,
    createdAt: '2024-02-15T09:30:00Z',
    updatedAt: '2025-11-20T14:00:00Z',
  },
  {
    id: 'org-3',
    name: 'King Faisal Hospital',
    country: 'KSA',
    userCount: 289,
    activeUserCount: 267,
    status: 'active',
    totalPoints: 198450,
    avgPointsPerUser: 686,
    deletedAt: null,
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2025-12-10T09:00:00Z',
  },
  {
    id: 'org-4',
    name: 'Abu Dhabi Medical Center',
    country: 'UAE',
    userCount: 156,
    activeUserCount: 142,
    status: 'active',
    totalPoints: 134560,
    avgPointsPerUser: 863,
    deletedAt: null,
    createdAt: '2024-03-05T11:15:00Z',
    updatedAt: '2025-12-01T16:30:00Z',
  },
  {
    id: 'org-5',
    name: 'Jeddah Clinic',
    country: 'KSA',
    userCount: 178,
    activeUserCount: 163,
    status: 'active',
    totalPoints: 145230,
    avgPointsPerUser: 816,
    deletedAt: null,
    createdAt: '2024-02-28T08:45:00Z',
  },
  {
    id: 'org-6',
    name: 'Sharjah Medical Center',
    country: 'UAE',
    userCount: 134,
    activeUserCount: 125,
    status: 'active',
    totalPoints: 98760,
    avgPointsPerUser: 737,
    deletedAt: null,
    createdAt: '2024-04-10T14:00:00Z',
  },
  {
    id: 'org-7',
    name: 'Dammam Hospital',
    country: 'KSA',
    userCount: 201,
    activeUserCount: 185,
    status: 'active',
    totalPoints: 167890,
    avgPointsPerUser: 835,
    deletedAt: null,
    createdAt: '2024-03-15T09:00:00Z',
  },
  {
    id: 'org-8',
    name: 'Al Ain Hospital',
    country: 'UAE',
    userCount: 89,
    activeUserCount: 78,
    status: 'active',
    totalPoints: 67450,
    avgPointsPerUser: 758,
    deletedAt: null,
    createdAt: '2024-05-20T10:30:00Z',
  },
  {
    id: 'org-9',
    name: 'Mecca Medical Complex',
    country: 'KSA',
    userCount: 245,
    activeUserCount: 220,
    status: 'active',
    totalPoints: 189340,
    avgPointsPerUser: 773,
    deletedAt: null,
    createdAt: '2024-02-01T08:00:00Z',
  },
  {
    id: 'org-10',
    name: 'Medina Healthcare',
    country: 'KSA',
    userCount: 167,
    activeUserCount: 152,
    status: 'active',
    totalPoints: 134560,
    avgPointsPerUser: 806,
    deletedAt: null,
    createdAt: '2024-04-25T11:00:00Z',
  },
  {
    id: 'org-11',
    name: 'Ras Al Khaimah Medical',
    country: 'UAE',
    userCount: 45,
    activeUserCount: 38,
    status: 'inactive',
    totalPoints: 23450,
    avgPointsPerUser: 521,
    deletedAt: null,
    createdAt: '2024-06-15T09:30:00Z',
  },
  {
    id: 'org-12',
    name: 'Khobar Clinic',
    country: 'KSA',
    userCount: 112,
    activeUserCount: 98,
    status: 'active',
    totalPoints: 89670,
    avgPointsPerUser: 800,
    deletedAt: null,
    createdAt: '2024-05-10T10:00:00Z',
  },
];

export const mockOrganizationAnalytics: OrganizationAnalytics[] = mockOrganizations.map((org) => ({
  organizationId: org.id,
  organizationName: org.name,
  totalUsers: org.userCount,
  activeUsers: org.activeUserCount,
  totalPoints: org.totalPoints,
  avgPointsPerUser: org.avgPointsPerUser,
  articlesViewed: Math.floor(Math.random() * 5000) + 1000,
  webinarsAttended: Math.floor(Math.random() * 500) + 100,
  quizzesTaken: Math.floor(Math.random() * 3000) + 500,
  storiesSubmitted: Math.floor(Math.random() * 100) + 20,
}));
