import { create } from 'zustand';
import type { UserFilterParams } from '../types';
import type { UserStatus } from '@/shared/types';
import { get, put, del } from '@/services/api/client';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  organization?: string;
  organizationId?: string;
  gender: string;
  dateOfBirth?: string;
  status: UserStatus;
  points: number;
  articlesViewed: number;
  webinarsAttended: number;
  storiesSubmitted: number;
  webinarsRegistered: number;
  quizzesTaken: number;
  rank: number;
  createdAt: string;
  lastActive?: string;
  role: string;
}

interface UsersState {
  users: User[];
  selectedUsers: string[];
  filters: UserFilterParams;
  isLoading: boolean;
  totalCount: number;
  
  // Actions
  setFilters: (filters: Partial<UserFilterParams>) => void;
  resetFilters: () => void;
  selectUser: (userId: string) => void;
  deselectUser: (userId: string) => void;
  selectAllUsers: () => void;
  deselectAllUsers: () => void;
  fetchUsers: () => Promise<void>;
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  bulkUpdateStatus: (userIds: string[], status: UserStatus) => Promise<void>;
  bulkDelete: (userIds: string[]) => Promise<void>;
}

const defaultFilters: UserFilterParams = {
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export const useUsersStore = create<UsersState>((set, getStore) => ({
  users: [],
  selectedUsers: [],
  filters: defaultFilters,
  isLoading: false,
  totalCount: 0,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters, page: newFilters.page ?? 1 },
    }));
  },

  resetFilters: () => {
    set({ filters: defaultFilters, selectedUsers: [] });
  },

  selectUser: (userId) => {
    set((state) => ({
      selectedUsers: state.selectedUsers.includes(userId)
        ? state.selectedUsers
        : [...state.selectedUsers, userId],
    }));
  },

  deselectUser: (userId) => {
    set((state) => ({
      selectedUsers: state.selectedUsers.filter((id) => id !== userId),
    }));
  },

  selectAllUsers: () => {
    set((state) => ({
      selectedUsers: state.users.map((u) => u.id),
    }));
  },

  deselectAllUsers: () => {
    set({ selectedUsers: [] });
  },

  fetchUsers: async () => {
    set({ isLoading: true });
    try {
      const { filters } = getStore();
      const offset = ((filters.page || 1) - 1) * (filters.limit || 20);
      
      const queryParams = new URLSearchParams({
        limit: (filters.limit || 20).toString(),
        offset: offset.toString(),
      });
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.country) queryParams.append('country', filters.country);
      
      const response = await get<any>(`/users?${queryParams.toString()}`);
      
      // Map backend response
      const mappedUsers: User[] = response.items.map((u: any) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        phone: u.phone_number || '',
        country: u.country || '',
        city: u.city || '',
        gender: u.gender || '',
        dateOfBirth: u.date_of_birth,
        status: u.status,
        points: u.points,
        articlesViewed: u.articles_viewed,
        webinarsAttended: u.webinars_attended,
        storiesSubmitted: u.stories_submitted,
        webinarsRegistered: u.webinars_registered,
        quizzesTaken: u.quizzes_taken,
        rank: u.rank,
        createdAt: u.created_at,
        lastActive: u.last_active,
        role: u.role,
      }));

      set({
        users: mappedUsers,
        totalCount: response.total,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateUserStatus: async (userId, status) => {
    set({ isLoading: true });
    try {
      await put(`/users/${userId}`, { status });
      set((state) => ({
        users: state.users.map((u) =>
          u.id === userId ? { ...u, status } : u
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteUser: async (userId) => {
    set({ isLoading: true });
    try {
      await del(`/users/${userId}`);
      set((state) => ({
        users: state.users.filter((u) => u.id !== userId),
        selectedUsers: state.selectedUsers.filter((id) => id !== userId),
        totalCount: state.totalCount - 1,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  bulkUpdateStatus: async (userIds, status) => {
    set({ isLoading: true });
    try {
      // Assuming backend supports a bulk update or we loop
      await Promise.all(userIds.map(id => put(`/users/${id}`, { status })));
      set((state) => ({
        users: state.users.map((u) =>
          userIds.includes(u.id) ? { ...u, status } : u
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  bulkDelete: async (userIds) => {
    set({ isLoading: true });
    try {
      await Promise.all(userIds.map(id => del(`/users/${id}`)));
      set((state) => ({
        users: state.users.filter((u) => !userIds.includes(u.id)),
        selectedUsers: state.selectedUsers.filter((id) => !userIds.includes(id)),
        totalCount: state.totalCount - userIds.length,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));

// Selectors
export const selectUsers = (state: UsersState) => state.users;
export const selectIsLoading = (state: UsersState) => state.isLoading;
export const selectFilters = (state: UsersState) => state.filters;
export const selectSelectedUsers = (state: UsersState) => state.selectedUsers;
export const selectTotalCount = (state: UsersState) => state.totalCount;
