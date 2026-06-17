/**
 * Admins module types
 */

export type AdminStatus = 'active' | 'inactive';
export type AdminRole = 'Super Admin' | 'Admin';

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminFormData {
  name: string;
  email: string;
  password?: string;
  role: AdminRole;
  status: AdminStatus;
}
