'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, Languages } from 'lucide-react';
import { EE } from '@/lib/dashboard/theme';
import { useLang } from '@/lib/dashboard/i18n';
import { clearTokens } from '@/lib/auth';
import type { User } from '@/types/user';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

export function DashboardShell({
  user,
  nav,
  children,
}: {
  user: User | null;
  nav: NavItem[];
  children: ReactNode;
}) {
  const { dir, t, toggle } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === href : pathname === href || pathname?.startsWith(href + '/');

  return (
    <div dir={dir} style={{ minHeight: '100vh', background: EE.parchment, fontFamily: EE.fontBody, color: EE.ink }}>
      {/* Mobile top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: EE.emerald,
          padding: '14px 18px',
        }}
        className="ee-mobile-bar"
      >
        <Logo compact />
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          style={{ background: 'transparent', border: 'none', color: EE.parchment, cursor: 'pointer' }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div style={{ display: 'flex', minHeight: '100vh' }} className="ee-shell-grid">
        {/* Sidebar */}
        <aside
          style={{
            width: 260,
            flexShrink: 0,
            background: EE.emerald,
            color: EE.parchment,
            display: mobileOpen ? 'flex' : undefined,
            flexDirection: 'column',
            position: 'relative',
          }}
          className={`ee-sidebar ${mobileOpen ? 'ee-sidebar-open' : ''}`}
        >
          <div style={{ padding: '26px 22px 18px' }}>
            <Logo />
          </div>

          <nav style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 14px',
                    borderRadius: EE.radiusSm,
                    textDecoration: 'none',
                    fontSize: 14.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? EE.emerald : EE.sageLight,
                    background: active ? EE.gold : 'transparent',
                    transition: 'all .2s',
                  }}
                >
                  <Icon size={18} color={active ? EE.emerald : EE.sage} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div style={{ padding: 18, borderTop: '1px solid rgba(185,203,188,.18)' }}>
            <button
              onClick={toggle}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                border: '1px solid rgba(185,203,188,.35)',
                color: EE.parchment,
                borderRadius: 30,
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              <Languages size={15} color={EE.gold} />
              {t.langToggle}
            </button>
            {user && (
              <div style={{ fontSize: 12.5, color: EE.sage, marginBottom: 10, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700, color: EE.parchment }}>
                  {user.first_name} {user.last_name}
                </div>
                <div>{user.email}</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                border: 'none',
                color: EE.sageLight,
                padding: '9px 4px',
                fontSize: 13.5,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
              {t.logout}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '32px 34px', minWidth: 0 }} className="ee-main">
          {children}
        </main>
      </div>

      <style>{`
        .ee-mobile-bar { display: none; }
        @media (max-width: 900px) {
          .ee-mobile-bar { display: flex; }
          .ee-sidebar { display: none !important; position: fixed; inset: 0 0 0 auto; z-index: 50; height: 100vh; }
          [dir="rtl"] .ee-sidebar { inset: 0 auto 0 0; }
          .ee-sidebar-open { display: flex !important; }
          .ee-main { padding: 20px 16px !important; }
        }
      `}</style>
    </div>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          border: `1.5px solid ${EE.gold}`,
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(217,180,95,.1)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: EE.fontArabicDisplay, color: EE.gold, fontWeight: 700, fontSize: compact ? 22 : 28, lineHeight: 1 }}>
          ح
        </span>
      </div>
      {!compact && (
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontFamily: EE.fontHead, fontSize: 17, fontWeight: 600, letterSpacing: '.4px', color: EE.parchment }}>
            ELHAFAZAH
          </div>
          <div style={{ fontFamily: EE.fontArabicDisplay, fontSize: 11, color: EE.sage, letterSpacing: '.5px' }}>
            أكاديمية الحفظة
          </div>
        </div>
      )}
    </div>
  );
}
