/**
 * Dashboard Zustand store — real data from GET /dashboard/metrics
 */

import { create } from 'zustand';
import { get } from '@/services/api/client';
import type { PlatformMetrics } from '../types';

interface DashboardState {
  metrics: PlatformMetrics | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboardData: () => Promise<void>;
}

function mapMetrics(raw: any): PlatformMetrics {
  return {
    totalUsers: raw.total_users,
    totalStudents: raw.total_students,
    totalTeachers: raw.total_teachers,
    totalAdmins: raw.total_admins,
    usersByStatus: raw.users_by_status,
    complaintsByStatus: raw.complaints_by_status,
    totalAllocations: raw.total_allocations,
    totalCountries: raw.total_countries,
    signupsByMonth: raw.signups_by_month.map((p: any) => ({ month: p.month, count: p.count })),
    recentSignups: raw.recent_signups.map((s: any) => ({
      id: s.id,
      fullName: s.full_name,
      email: s.email,
      role: s.role,
      createdAt: s.created_at,
    })),
  };
}

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: null,
  isLoading: false,
  error: null,

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const raw = await get<any>('/dashboard/metrics');
      set({ metrics: mapMetrics(raw), isLoading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.detail || 'Failed to load dashboard metrics',
        isLoading: false,
      });
    }
  },
}));
