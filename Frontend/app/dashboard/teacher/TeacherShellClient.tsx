'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, CalendarDays, CalendarClock, Users } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type User } from '@/types/user';
import { LangProvider, useLang } from '@/lib/dashboard/i18n';
import { DashboardUserProvider } from '@/lib/dashboard/UserContext';
import { DashboardShell, type NavItem } from '@/components/dashboard/DashboardShell';
import { EE } from '@/lib/dashboard/theme';

function TeacherShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useLang();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchUser() {
      try {
        const { data } = await apiClient.get<User>('/users/me');
        if (!cancelled) setUser(data);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) router.push('/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const nav: NavItem[] = [
    { href: '/dashboard/teacher', label: t.navOverview, icon: LayoutDashboard },
    { href: '/dashboard/teacher/schedule', label: t.navSchedule, icon: CalendarDays },
    { href: '/dashboard/teacher/students', label: t.navStudents, icon: Users },
    { href: '/dashboard/teacher/calendar', label: t.navCalendar, icon: CalendarClock },
  ];

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: EE.parchment,
          color: EE.sageMuted,
          fontFamily: EE.fontBody,
        }}
      >
        {t.loading}
      </div>
    );
  }

  return (
    <DashboardUserProvider user={user}>
      <DashboardShell user={user} nav={nav}>
        {children}
      </DashboardShell>
    </DashboardUserProvider>
  );
}

export function TeacherShellClient({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <TeacherShellInner>{children}</TeacherShellInner>
    </LangProvider>
  );
}
