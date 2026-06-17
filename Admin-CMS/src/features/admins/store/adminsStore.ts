/**
 * Admins store using Zustand
 */

import { create } from 'zustand';
import type { Admin } from '../types';
import { mockAdminUsers } from '@/mock-data/admins';

interface AdminsState {
  admins: Admin[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAdmins: () => Promise<void>;
  addAdmin: (admin: Omit<Admin, 'id' | 'createdAt'>) => Promise<void>;
  updateAdmin: (id: string, admin: Partial<Admin>) => Promise<void>;
  deleteAdmin: (id: string) => Promise<void>;
}

export const useAdminsStore = create<AdminsState>((set) => ({
  admins: [],
  isLoading: false,
  error: null,

  fetchAdmins: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({ admins: mockAdminUsers, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch admins', isLoading: false });
    }
  },

  addAdmin: async (admin) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const newAdmin: Admin = {
        ...admin,
        id: `admin-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      
      set((state) => ({ 
        admins: [newAdmin, ...state.admins], 
        isLoading: false 
      }));
    } catch (error) {
      set({ error: 'Failed to add admin', isLoading: false });
      throw error;
    }
  },

  updateAdmin: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      set((state) => ({
        admins: state.admins.map((admin) =>
          admin.id === id
            ? { ...admin, ...updates, updatedAt: new Date().toISOString() }
            : admin
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update admin', isLoading: false });
      throw error;
    }
  },

  deleteAdmin: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      set((state) => ({
        admins: state.admins.filter((admin) => admin.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete admin', isLoading: false });
      throw error;
    }
  },
}));
