/**
 * Zustand store for subscription plans — backed by the /plans API.
 */
import { create } from 'zustand';
import { get, post, patch, del } from '@/services/api/client';

export interface Plan {
  id: string;
  name: string;
  nameAr?: string;
  sessionsPerWeek: number;
  sessionDurationMinutes: number;
  price: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanCreateInput {
  name: string;
  name_ar?: string;
  sessions_per_week: number;
  session_duration_minutes: number;
  price: number;
  currency?: string;
}

export interface PlanUpdateInput extends Partial<PlanCreateInput> {
  is_active?: boolean;
}

const mapPlan = (item: any): Plan => ({
  id: item.id,
  name: item.name,
  nameAr: item.name_ar ?? undefined,
  sessionsPerWeek: item.sessions_per_week,
  sessionDurationMinutes: item.session_duration_minutes,
  price: item.price,
  currency: item.currency,
  isActive: item.is_active,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

// Localized display name for a plan — Plan.name is always the English name
// an admin typed; nameAr is optional, so a plan without one still shows
// something sensible in Arabic rather than falling back to raw English.
function arabicSessionsPhrase(sessionsPerWeek: number): string {
  if (sessionsPerWeek === 1) return 'حلقه واحده اسبوعيا';
  if (sessionsPerWeek === 2) return 'حلقتين اسبوعيا';
  return `${sessionsPerWeek} حلقات اسبوعيا`;
}

// Structural (not the exact Plan type) so this also accepts subscriptions'
// nested SubscriptionPlan, which has the same shape minus a couple of
// timestamp fields it has no use for.
interface DisplayNameable {
  name: string;
  nameAr?: string;
  sessionsPerWeek: number;
  sessionDurationMinutes: number;
}

export function getPlanDisplayName(plan: DisplayNameable, lang: string): string {
  if (lang === 'ar') {
    return plan.nameAr || `${arabicSessionsPhrase(plan.sessionsPerWeek)} - ${plan.sessionDurationMinutes} دقيقة`;
  }
  return plan.name;
}

interface PlansState {
  plans: Plan[];
  isLoading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  createPlan: (data: PlanCreateInput) => Promise<void>;
  updatePlan: (id: string, data: PlanUpdateInput) => Promise<void>;
  deactivatePlan: (id: string) => Promise<void>;
}

export const usePlansStore = create<PlansState>((set) => ({
  plans: [],
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<any[]>('/plans');
      set({ plans: response.map(mapPlan), isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch plans',
        isLoading: false,
      });
    }
  },

  createPlan: async (data) => {
    await post('/plans', data);
    const response = await get<any[]>('/plans');
    set({ plans: response.map(mapPlan) });
  },

  updatePlan: async (id, data) => {
    await patch(`/plans/${id}`, data);
    const response = await get<any[]>('/plans');
    set({ plans: response.map(mapPlan) });
  },

  deactivatePlan: async (id) => {
    await del(`/plans/${id}`);
    const response = await get<any[]>('/plans');
    set({ plans: response.map(mapPlan) });
  },
}));
