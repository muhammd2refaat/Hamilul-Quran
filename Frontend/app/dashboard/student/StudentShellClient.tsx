'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  ClipboardList,
  Video,
  CalendarClock,
  ArrowRightLeft,
  Info,
  Mail,
  Receipt,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type User } from '@/types/user';
import { type Allocation } from '@/types/dashboard';
import { LangProvider, useLang } from '@/lib/dashboard/i18n';
import { DashboardUserProvider } from '@/lib/dashboard/UserContext';
import { StudentStatusProvider } from '@/lib/dashboard/StudentStatusContext';
import { DashboardShell, type NavItem } from '@/components/dashboard/DashboardShell';
import { EE } from '@/lib/dashboard/theme';

function StudentShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useLang();
  const [user, setUser] = useState<User | null>(null);
  const [allocations, setAllocations] = useState<Allocation[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const { data: userData } = await apiClient.get<User>('/users/me');
        if (cancelled) return;
        setUser(userData);

        const { data: allocData } = await apiClient.get<Allocation[]>('/allocations/me');
        if (!cancelled) setAllocations(allocData);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) router.push('/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading || !user || allocations === null) {
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

  const isNew = allocations.length === 0;

  const nav: NavItem[] = isNew
    ? [
        { href: '/dashboard/student', label: t.navOverview, icon: LayoutDashboard },
        { href: '/dashboard/student/plan', label: t.navPlan, icon: ClipboardList },
        { href: '/dashboard/student/receipts', label: t.navReceipts, icon: Receipt },
        { href: '/dashboard/student/about', label: t.navAbout, icon: Info },
        { href: '/dashboard/student/contact', label: t.navContact, icon: Mail },
      ]
    : [
        { href: '/dashboard/student', label: t.navOverview, icon: LayoutDashboard },
        { href: '/dashboard/student/progress', label: t.navProgress, icon: TrendingUp },
        { href: '/dashboard/student/plan', label: t.navPlan, icon: ClipboardList },
        { href: '/dashboard/student/receipts', label: t.navReceipts, icon: Receipt },
        { href: '/dashboard/student/webinar', label: t.navWebinar, icon: Video },
        { href: '/dashboard/student/calendar', label: t.navCalendar, icon: CalendarClock },
        { href: '/dashboard/student/teacher-change', label: t.navTeacherChange, icon: ArrowRightLeft },
        { href: '/dashboard/student/about', label: t.navAbout, icon: Info },
        { href: '/dashboard/student/contact', label: t.navContact, icon: Mail },
      ];

  return (
    <DashboardUserProvider user={user}>
      <StudentStatusProvider allocations={allocations}>
        <DashboardShell user={user} nav={nav}>
          {children}
        </DashboardShell>
      </StudentStatusProvider>
    </DashboardUserProvider>
  );
}

export function StudentShellClient({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <StudentShellInner>{children}</StudentShellInner>
    </LangProvider>
  );
}
