'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Allocation } from '@/types/dashboard';

interface StudentStatusValue {
  /** True when the student has no active allocation yet (pre-trial/pre-plan). */
  isNew: boolean;
  allocations: Allocation[];
}

const StudentStatusContext = createContext<StudentStatusValue | null>(null);

export function StudentStatusProvider({
  allocations,
  children,
}: {
  allocations: Allocation[];
  children: ReactNode;
}) {
  return (
    <StudentStatusContext.Provider value={{ isNew: allocations.length === 0, allocations }}>
      {children}
    </StudentStatusContext.Provider>
  );
}

export function useStudentStatus(): StudentStatusValue {
  const ctx = useContext(StudentStatusContext);
  if (!ctx) throw new Error('useStudentStatus must be used within a StudentStatusProvider');
  return ctx;
}
