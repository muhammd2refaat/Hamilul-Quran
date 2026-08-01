'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { User } from '@/types/user';

interface DashboardUserValue {
  user: User;
}

const DashboardUserContext = createContext<DashboardUserValue | null>(null);

export function DashboardUserProvider({ user, children }: { user: User; children: ReactNode }) {
  return <DashboardUserContext.Provider value={{ user }}>{children}</DashboardUserContext.Provider>;
}

export function useDashboardUser(): User {
  const ctx = useContext(DashboardUserContext);
  if (!ctx) throw new Error('useDashboardUser must be used within a DashboardUserProvider');
  return ctx.user;
}
