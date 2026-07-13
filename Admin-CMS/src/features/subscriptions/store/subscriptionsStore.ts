/**
 * Zustand store for student subscriptions — backed by the /subscriptions API.
 */
import { create } from 'zustand';
import { get, put } from '@/services/api/client';

export type SubscriptionStatus = 'active' | 'paused' | 'withdrawn';

export interface Subscription {
  id: string;
  studentId: string;
  studentName: string;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUpsertInput {
  plan_name: string;
  status: SubscriptionStatus;
  start_date: string;
  notes?: string;
}

interface SubscriptionsState {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;
  fetchSubscriptions: () => Promise<void>;
  upsertSubscription: (studentId: string, data: SubscriptionUpsertInput) => Promise<void>;
}

const mapSubscription = (item: any): Subscription => ({
  id: item.id,
  studentId: item.student_id,
  studentName: item.student_name,
  planName: item.plan_name,
  status: item.status,
  startDate: item.start_date,
  notes: item.notes ?? undefined,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

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
        error: error.response?.data?.detail || 'Failed to fetch subscriptions',
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
