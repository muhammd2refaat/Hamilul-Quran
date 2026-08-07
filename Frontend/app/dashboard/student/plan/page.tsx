'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, RefreshCcw } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useLang } from '@/lib/dashboard/i18n';
import { useStudentStatus } from '@/lib/dashboard/StudentStatusContext';
import { EE } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { Placeholder } from '@/components/dashboard/Placeholder';
import { PlanRequestModal } from '@/components/dashboard/PlanRequestModal';
import type { Subscription, SubscriptionStatus } from '@/types/dashboard';

const STATUS_COLORS: Record<SubscriptionStatus, { bg: string; fg: string }> = {
  active: { bg: 'rgba(16,163,74,.12)', fg: '#0F7A3D' },
  paused: { bg: 'rgba(217,180,95,.18)', fg: EE.goldDeep },
  withdrawn: { bg: 'rgba(220,38,38,.12)', fg: '#B91C1C' },
};

export default function StudentPlanPage() {
  const { t, lang } = useLang();
  const { isNew, allocations } = useStudentStatus();
  const [changeOpen, setChangeOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);

  const alloc = allocations[0];

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<Subscription>('/subscriptions/me')
      .then(({ data }) => {
        if (!cancelled) setSubscription(data);
      })
      .catch(() => {
        // 404 = no subscription set up yet — fall back to the pending state below.
      })
      .finally(() => {
        if (!cancelled) setLoadingSub(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel = subscription
    ? { active: t.planStatusActive, paused: t.planStatusPaused, withdrawn: t.planStatusWithdrawn }[subscription.status]
    : t.planStatusPending;
  const statusColors = subscription
    ? STATUS_COLORS[subscription.status]
    : { bg: 'rgba(217,180,95,.18)', fg: EE.goldDeep };

  return (
    <div>
      <SectionHeader title={t.planTitle} desc={t.planDesc} />

      <div
        style={{
          background: '#fff',
          border: `1px solid ${EE.border}`,
          borderRadius: EE.radiusLg,
          padding: 24,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'rgba(217,180,95,.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardList size={20} color={EE.goldDeep} />
            </div>
            <div>
              <div style={{ fontFamily: EE.fontHead, fontSize: 16, fontWeight: 600, color: EE.ink }}>
                {subscription ? subscription.plan_name : isNew ? t.planStatusPending : t.currentPlanSnapshot}
              </div>
              {!isNew && alloc && (
                <div style={{ fontSize: 12.5, color: EE.sageMuted }}>
                  {alloc.sessions_per_week}× / week · {alloc.duration} min
                </div>
              )}
            </div>
          </div>

          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 14px',
              borderRadius: 20,
              background: statusColors.bg,
              color: statusColors.fg,
            }}
          >
            {statusLabel}
          </span>
        </div>

        {loadingSub ? (
          <p style={{ fontSize: 13, color: EE.sageMuted }}>{t.loading}</p>
        ) : subscription ? (
          <div style={{ fontSize: 13.5, color: EE.ink, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <span style={{ color: EE.sageMuted }}>{t.planStartDateLabel}: </span>
              {new Date(subscription.start_date).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US')}
            </div>
            {subscription.notes && (
              <div>
                <span style={{ color: EE.sageMuted }}>{t.planNotesLabel}: </span>
                {subscription.notes}
              </div>
            )}
          </div>
        ) : (
          <Placeholder text={t.planComingSoon} />
        )}
      </div>

      {sent ? (
        <p style={{ fontSize: 14, color: EE.emerald, fontWeight: 600 }}>{t.requestSent}</p>
      ) : (
        <button
          onClick={() => setChangeOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: EE.emerald,
            color: EE.parchment,
            border: 'none',
            padding: '12px 22px',
            borderRadius: 9,
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <RefreshCcw size={15} />
          {t.changePlanBtn}
        </button>
      )}

      <PlanRequestModal
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        onSuccess={() => setSent(true)}
        title={t.changePlanBtn}
        description={t.changePlanDesc}
      />
    </div>
  );
}
