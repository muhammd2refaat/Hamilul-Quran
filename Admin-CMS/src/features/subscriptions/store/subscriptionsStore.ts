/**
 * Zustand store for student subscriptions — backed by the /subscriptions API.
 */
import { create } from 'zustand';
import { get, put } from '@/services/api/client';

export type SubscriptionStatus = 'active' | 'paused' | 'withdrawn';

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr?: string;
  sessionsPerWeek: number;
  sessionDurationMinutes: number;
  price: string;
  currency: string;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  studentId: string;
  studentName: string;
  planId?: string;
  planName: string;
  plan?: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  notes?: string;
  sessionsRemaining?: number;
  pausedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUpsertInput {
  plan_id?: string;
  plan_name?: string;
  status: SubscriptionStatus;
  start_date: string;
  notes?: string;
  sessions_remaining?: number;
}

const mapPlan = (item: any): SubscriptionPlan => ({
  id: item.id,
  name: item.name,
  nameAr: item.name_ar ?? undefined,
  sessionsPerWeek: item.sessions_per_week,
  sessionDurationMinutes: item.session_duration_minutes,
  price: item.price,
  currency: item.currency,
  isActive: item.is_active,
});

const mapSubscription = (item: any): Subscription => ({
  id: item.id,
  studentId: item.student_id,
  studentName: item.student_name,
  planId: item.plan_id ?? undefined,
  planName: item.plan_name,
  plan: item.plan ? mapPlan(item.plan) : undefined,
  status: item.status,
  startDate: item.start_date,
  notes: item.notes ?? undefined,
  sessionsRemaining: item.sessions_remaining ?? undefined,
  pausedAt: item.paused_at ?? undefined,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

interface SubscriptionsState {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;
  fetchSubscriptions: () => Promise<void>;
  upsertSubscription: (studentId: string, data: SubscriptionUpsertInput) => Promise<void>;
}

export const useSubscriptionsStore = create<SubscriptionsState>((set) => ({
  subscriptions: [],
  isLoading: false,
  error: null,

  fetchSubscriptions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<any[]>('/subscriptions');
      set({ subscriptions: response.map(mapSubscription), isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch subscriptions',
        isLoading: false,
      });
    }
  },

  upsertSubscription: async (studentId: string, data: SubscriptionUpsertInput) => {
    await put<any>(`/subscriptions/${studentId}`, data);
    // The PUT response doesn't include the joined student_name — refetch the
    // admin list so the store stays fully in sync with the backend.
    const response = await get<any[]>('/subscriptions');
    set({ subscriptions: response.map(mapSubscription) });
  },
}));
