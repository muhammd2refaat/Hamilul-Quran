import { create } from 'zustand';
import type { UserFilterParams } from '../types';
import type { UserStatus } from '@/shared/types';
import { get, post, patch, del } from '@/services/api/client';

export interface User {
  id: string;
  username: string;          // backend: username
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  gender: string;
  dateOfBirth?: string;
  status: UserStatus;
  createdAt: string;
  joinedDate: string;        // backend: joined_date (differs from created_at)
  updatedAt: string;         // backend: updated_at
  role: string;
  teacherId?: string;        // backend: teacher_id — student's assigned teacher UUID
}

export interface UserCreateInput {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  phone?: string;
  country?: string;
  city?: string;
  gender?: 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  teacherId?: string;
  /** Optional — the backend generates a temporary password if omitted. */
  password?: string;
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
  createUser: (data: UserCreateInput) => Promise<User>;
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  bulkUpdateStatus: (userIds: string[], status: UserStatus) => Promise<void>;
  bulkDelete: (userIds: string[]) => Promise<void>;
}

const defaultFilters: UserFilterParams = {
  page: 1,
  limit: 100,
  sortBy: 'created_at',
  sortOrder: 'desc',
};

function mapUser(u: any): User {
  return {
    id: u.id,
    username: u.username || '',
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    phone: u.phone_number || '',
    country: u.country || '',
    city: u.city || '',
    gender: u.gender || '',
    dateOfBirth: u.date_of_birth,
    status: u.status,
    createdAt: u.created_at,
    joinedDate: u.joined_date || u.created_at,
    updatedAt: u.updated_at || u.created_at,
    role: u.role,
    teacherId: u.teacher_id ?? undefined,
  };
}

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
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.sortBy) queryParams.append('sort_by', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sort_order', filters.sortOrder);

      const response = await get<any>(`/users?${queryParams.toString()}`);

      set({
        users: response.items.map(mapUser),
        totalCount: response.total,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createUser: async (data) => {
    set({ isLoading: true });
    try {
      const created = await post<any>('/users', {
        email: data.email,
        username: data.username,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        phone_number: data.phone,
        country: data.country,
        city: data.city,
        gender: data.gender,
        date_of_birth: data.dateOfBirth,
        teacher_id: data.teacherId,
        password: data.password,
      });
      const user = mapUser(created);
      set((state) => ({
        users: [user, ...state.users],
        totalCount: state.totalCount + 1,
        isLoading: false,
      }));
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateUserStatus: async (userId, status) => {
    set({ isLoading: true });
    try {
      await patch(`/users/${userId}`, { status });
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
      await Promise.all(userIds.map((id) => patch(`/users/${id}`, { status })));
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
      await Promise.all(userIds.map((id) => del(`/users/${id}`)));
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
