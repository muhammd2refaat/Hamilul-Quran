/**
 * Users Zustand store
 */

import { create } from 'zustand';
import type { User } from '@/mock-data/users';
import type { UserFilterParams } from '../types';
import { mockUsers } from '@/mock-data/users';
import type { UserStatus } from '@/shared/types';

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
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const useUsersStore = create<UsersState>((set, get) => ({
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const { filters } = get();
      let filteredUsers = [...mockUsers];

      // Apply filters
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(
          (u) =>
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search)
        );
      }
      if (filters.status) {
        filteredUsers = filteredUsers.filter((u) => u.status === filters.status);
      }
      if (filters.country) {
        filteredUsers = filteredUsers.filter((u) => u.country === filters.country);
      }
      if (filters.organization) {
        filteredUsers = filteredUsers.filter((u) => u.organizationId === filters.organization);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      filteredUsers.sort((a, b) => {
        const aVal = a[sortBy as keyof User];
        const bVal = b[sortBy as keyof User];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const startIndex = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

      set({
        users: paginatedUsers,
        totalCount: filteredUsers.length,
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
      await new Promise((resolve) => setTimeout(resolve, 500));
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
      await new Promise((resolve) => setTimeout(resolve, 500));
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
      await new Promise((resolve) => setTimeout(resolve, 500));
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
      await new Promise((resolve) => setTimeout(resolve, 500));
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
