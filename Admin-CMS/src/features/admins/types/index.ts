/**
 * Admins module types
 */

export type AdminStatus = 'active' | 'inactive';
export type AdminRole = 'Super Admin' | 'Admin';

export interface Admin {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  isSuperAdmin: boolean;
  /** Still on a temporary password (or told to pick a new one). */
  mustChangePassword: boolean;
  /** When the temporary password stops working. */
  tempPasswordExpiresAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminFormData {
  firstName: string;
  lastName: string;
  email: string;
  status: AdminStatus;
}

export interface AuditEntry {
  id: string;
  actor_email: string;
  action: string;
  target_email: string | null;
  details: string | null;
  created_at: string;
}

export interface EmailUsage {
  sent_today: number;
  blocked_today: number;
  normal_cutoff: number;
  daily_cap: number;
  enabled: boolean;
}
