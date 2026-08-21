/**
 * Dashboard Zustand store — real data from GET /dashboard/metrics
 */

import { create } from 'zustand';
import { get as apiGet } from '@/services/api/client';
import type { PlatformMetrics } from '../types';

interface DashboardState {
  metrics: PlatformMetrics | null;
  isLoading: boolean;
  error: string | null;
  months: number;
  setMonths: (months: number) => void;
  fetchDashboardData: (months?: number) => Promise<void>;
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
    avgSessionScorePct: raw.avg_session_score_pct ?? null,
    scoreTrendByMonth: (raw.score_trend_by_month ?? []).map((p: any) => ({
      month: p.month,
      avgPct: p.avg_pct,
      count: p.count,
    })),
    topTeachersByScore: (raw.top_teachers_by_score ?? []).map((t: any) => ({
      teacherId: t.teacher_id,
      teacherName: t.teacher_name,
      avgPct: t.avg_pct,
      sessionCount: t.session_count,
    })),
    attendanceBothJoinedRatePct: raw.attendance_both_joined_rate_pct ?? null,
    attendanceTrendByWeek: (raw.attendance_trend_by_week ?? []).map((p: any) => ({
      week: p.week,
      ratePct: p.rate_pct,
    })),
    subscriptionsByStatus: raw.subscriptions_by_status ?? {},
    subscriptionsByPlan: raw.subscriptions_by_plan ?? {},
  };
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  metrics: null,
  isLoading: false,
  error: null,
  months: 6,

  setMonths: (months: number) => {
    set({ months });
    get().fetchDashboardData(months);
  },

  fetchDashboardData: async (months) => {
    set({ isLoading: true, error: null });
    try {
      const raw = await apiGet<any>('/dashboard/metrics', { params: { months: months ?? get().months } });
      set({ metrics: mapMetrics(raw), isLoading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.detail || 'Failed to load dashboard metrics',
        isLoading: false,
      });
    }
  },
}));
