/**
 * Admins store using Zustand — real backend data (role=ADMIN users via /admins).
 */

import { create } from 'zustand';
import { get, post, patch, del } from '@/services/api/client';
import type { Admin, AdminRole, AdminStatus } from '../types';

interface AdminsState {
  admins: Admin[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAdmins: () => Promise<void>;
  addAdmin: (admin: {
    name: string;
    email: string;
    role: AdminRole;
    status: AdminStatus;
    password?: string;
  }) => Promise<void>;
  updateAdmin: (
    id: string,
    admin: Partial<{ name: string; role: AdminRole; status: AdminStatus }>
  ) => Promise<void>;
  deleteAdmin: (id: string) => Promise<void>;
}

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] || 'Admin';
  const last = parts.slice(1).join(' ');
  return [first, last];
}

// Backend has a single ADMIN role — the CMS's Super Admin/Admin distinction
// is display-only for now (not persisted). See Admin-CMS/PROGRESS.md.
function mapAdmin(u: any): Admin {
  return {
    id: u.id,
    name: `${u.first_name} ${u.last_name}`.trim(),
    email: u.email,
    role: 'Admin',
    status: u.status === 'ACTIVE' ? 'active' : 'inactive',
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

export const useAdminsStore = create<AdminsState>((set) => ({
  admins: [],
  isLoading: false,
  error: null,

  fetchAdmins: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<any>('/admins?limit=100');
      set({ admins: response.items.map(mapAdmin), isLoading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.detail || 'Failed to fetch admins',
        isLoading: false,
      });
    }
  },

  addAdmin: async (admin) => {
    set({ isLoading: true, error: null });
    try {
      const [firstName, lastName] = splitName(admin.name);
      const created = await post<any>('/admins', {
        email: admin.email,
        username: admin.email.split('@')[0],
        first_name: firstName,
        last_name: lastName,
        password: admin.password || undefined,
      });
      set((state) => ({
        admins: [mapAdmin(created), ...state.admins],
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateAdmin: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const payload: Record<string, unknown> = {};
      if (updates.name) {
        const [firstName, lastName] = splitName(updates.name);
        payload.first_name = firstName;
        payload.last_name = lastName;
      }
      if (updates.status) {
        payload.status = updates.status === 'active' ? 'ACTIVE' : 'INACTIVE';
      }
      const updated = await patch<any>(`/admins/${id}`, payload);
      set((state) => ({
        admins: state.admins.map((a) => (a.id === id ? mapAdmin(updated) : a)),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteAdmin: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await del(`/admins/${id}`);
      set((state) => ({
        admins: state.admins.filter((a) => a.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
