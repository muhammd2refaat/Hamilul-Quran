/**
 * Admins store using Zustand — real backend data (role=ADMIN users via /admins).
 * Adding, editing, deleting and password resets are Super Admin only; the
 * backend enforces it, the page just hides the buttons for everyone else.
 */

import { create } from 'zustand';
import { get, post, patch, del } from '@/services/api/client';
import type { Admin, AdminStatus, AuditEntry, EmailUsage } from '../types';

interface AdminsState {
  admins: Admin[];
  isLoading: boolean;
  error: string | null;
  audit: AuditEntry[];
  emailUsage: EmailUsage | null;

  fetchAdmins: () => Promise<void>;
  /** Returns whether the temporary-password email went out. */
  addAdmin: (admin: { firstName: string; lastName: string; email: string }) => Promise<boolean>;
  updateAdmin: (id: string, admin: Partial<{ firstName: string; lastName: string; status: AdminStatus }>) => Promise<void>;
  deleteAdmin: (id: string) => Promise<void>;
  /** Emails a new temporary password. Returns whether the email went out. */
  resetPassword: (id: string) => Promise<boolean>;
  fetchAudit: () => Promise<void>;
  fetchEmailUsage: () => Promise<void>;
}

function mapAdmin(u: any): Admin {
  return {
    id: u.id,
    name: `${u.first_name} ${u.last_name}`.trim(),
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    role: u.is_super_admin ? 'Super Admin' : 'Admin',
    status: u.status === 'ACTIVE' ? 'active' : 'inactive',
    isSuperAdmin: !!u.is_super_admin,
    mustChangePassword: !!u.must_change_password,
    tempPasswordExpiresAt: u.temp_password_expires_at ?? null,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

export const useAdminsStore = create<AdminsState>((set) => ({
  admins: [],
  isLoading: false,
  error: null,
  audit: [],
  emailUsage: null,

  fetchAdmins: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<any>('/admins?limit=100');
      set({ admins: response.items.map(mapAdmin), isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to load admins' });
    }
  },

  addAdmin: async ({ firstName, lastName, email }) => {
    const created = await post<any>('/admins', { email, first_name: firstName, last_name: lastName });
    set((state) => ({ admins: [mapAdmin(created), ...state.admins] }));
    return !!created.email_sent;
  },

  updateAdmin: async (id, updates) => {
    const payload: Record<string, unknown> = {};
    if (updates.firstName !== undefined) payload.first_name = updates.firstName;
    if (updates.lastName !== undefined) payload.last_name = updates.lastName;
    if (updates.status) payload.status = updates.status === 'active' ? 'ACTIVE' : 'INACTIVE';
    const updated = await patch<any>(`/admins/${id}`, payload);
    set((state) => ({ admins: state.admins.map((a) => (a.id === id ? mapAdmin(updated) : a)) }));
  },

  deleteAdmin: async (id) => {
    await del(`/admins/${id}`);
    set((state) => ({ admins: state.admins.filter((a) => a.id !== id) }));
  },

  resetPassword: async (id) => {
    const updated = await post<any>(`/admins/${id}/reset-password`);
    set((state) => ({ admins: state.admins.map((a) => (a.id === id ? mapAdmin(updated) : a)) }));
    return !!updated.email_sent;
  },

  fetchAudit: async () => {
    const audit = await get<AuditEntry[]>('/admins/audit-log?limit=50');
    set({ audit });
  },

  fetchEmailUsage: async () => {
    const emailUsage = await get<EmailUsage>('/admins/email-usage');
    set({ emailUsage });
  },
}));
