/**
 * Dashboard Zustand store
 */

import { create } from 'zustand';
import type { DashboardFilters, DashboardMetrics } from '../types';
import { 
  mockDashboardMetrics, 
  mockTopUsers, 
  mockCountryLeaderboard, 
  mockEngagementOverTime
} from '@/mock-data/dashboard';

// Convert mock data to our types
const convertedMetrics: DashboardMetrics = {
  totalUsers: mockDashboardMetrics.totalUsers,
  pendingUsers: mockDashboardMetrics.pendingUsers,
  activeUsers: mockDashboardMetrics.activeUsers,
  inactiveUsers: mockDashboardMetrics.inactiveUsers,
  totalCountries: mockDashboardMetrics.totalCountries,
  totalOrganizations: mockDashboardMetrics.totalOrganizations,
  totalQuizzes: mockDashboardMetrics.totalQuizzes,
  totalArticlesPublished: mockDashboardMetrics.totalArticles,
  totalWebinars: mockDashboardMetrics.totalWebinars,
  totalStories: mockDashboardMetrics.totalStories,
  totalProducts: mockDashboardMetrics.totalProducts,
  totalCategories: mockDashboardMetrics.totalCategories,
};

interface DashboardState {
  filters: DashboardFilters;
  isLoading: boolean;
  metrics: DashboardMetrics | null;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
  fetchDashboardData: () => Promise<void>;
}

const defaultFilters: DashboardFilters = {
  dateRange: 'month',
};

export const useDashboardStore = create<DashboardState>((set) => ({
  filters: defaultFilters,
  isLoading: false,
  metrics: null,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
  },

  fetchDashboardData: async () => {
    set({ isLoading: true });
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      set({ 
        metrics: convertedMetrics,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));

// Export mock data getters for components
export const getDashboardMetrics = () => convertedMetrics;
export const getLeaderboard = () => mockTopUsers;
export const getCountryLeaderboard = () => mockCountryLeaderboard;
export const getEngagementTrends = () => mockEngagementOverTime;
