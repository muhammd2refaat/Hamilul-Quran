'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, RefreshCcw, Inbox, Pencil } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useLang } from '@/lib/dashboard/i18n';
import { useStudentStatus } from '@/lib/dashboard/StudentStatusContext';
import { EE } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { Placeholder } from '@/components/dashboard/Placeholder';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { PlanRequestModal } from '@/components/dashboard/PlanRequestModal';
import type { PlatformRequest, Subscription, SubscriptionStatus } from '@/types/dashboard';

const STATUS_COLORS: Record<SubscriptionStatus, { bg: string; fg: string }> = {
  active: { bg: 'rgba(16,163,74,.12)', fg: '#0F7A3D' },
  paused: { bg: 'rgba(217,180,95,.18)', fg: EE.goldDeep },
  withdrawn: { bg: 'rgba(220,38,38,.12)', fg: '#B91C1C' },
};

const REQUEST_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: 'rgba(217,180,95,.18)', fg: '#B08A2E' },
  in_review: { bg: 'rgba(59,130,246,.12)', fg: '#1D4ED8' },
  approved: { bg: 'rgba(16,163,74,.12)', fg: '#0F7A3D' },
  rejected: { bg: 'rgba(220,38,38,.1)', fg: '#B91C1C' },
};

export default function StudentPlanPage() {
  const { t, lang } = useLang();
  const { isNew, allocations } = useStudentStatus();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PlatformRequest | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [planRequests, setPlanRequests] = useState<PlatformRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const alloc = allocations[0];

  function openCreateModal() {
    setEditingRequest(null);
    setModalOpen(true);
  }
  function openEditModal(r: PlatformRequest) {
    setEditingRequest(r);
    setModalOpen(true);
  }
  const EDITABLE_STATUSES = new Set(['pending', 'in_review']);

  const loadPlanRequests = () => {
    apiClient
      .get<PlatformRequest[]>('/requests/me')
      .then(({ data }) => setPlanRequests(data.filter((r) => r.type === 'new_enrollment')))
      .finally(() => setLoadingRequests(false));
  };

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

  useEffect(() => {
    loadPlanRequests();
  }, []);

  const requestStatusLabel = (status: string) =>
    ({
      pending: t.statusPending,
      in_review: t.statusInReview,
      approved: t.statusApproved,
      rejected: t.statusRejected,
    })[status] ?? status;

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

      <button
        onClick={openCreateModal}
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
          marginBottom: 26,
        }}
      >
        <RefreshCcw size={15} />
        {t.changePlanBtn}
      </button>

      <h3 style={{ fontFamily: EE.fontHead, fontSize: 15.5, fontWeight: 600, color: EE.ink, marginBottom: 14 }}>
        {t.myRequests}
      </h3>

      {loadingRequests ? (
        <p style={{ color: EE.sageMuted, fontSize: 14 }}>{t.loading}</p>
      ) : planRequests.length === 0 ? (
        <EmptyState icon={Inbox} text={t.noRequests} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {planRequests.map((r) => {
            const colors = REQUEST_STATUS_COLORS[r.status] ?? REQUEST_STATUS_COLORS.pending;
            return (
              <div
                key={r.id}
                style={{
                  background: '#fff',
                  border: `1px solid ${EE.border}`,
                  borderRadius: EE.radiusMd,
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, color: EE.sageMuted }}>
                    {new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {EDITABLE_STATUSES.has(r.status) && (
                      <button
                        onClick={() => openEditModal(r)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'transparent',
                          border: `1px solid ${EE.border}`,
                          color: EE.emerald,
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 11.5,
                          fontWeight: 600,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil size={11} />
                        {t.editBtn}
                      </button>
                    )}
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 20,
                        background: colors.bg,
                        color: colors.fg,
                      }}
                    >
                      {requestStatusLabel(r.status)}
                    </span>
                  </div>
                </div>
                {r.requested_plan && (
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: EE.ink, marginBottom: 4 }}>
                    {t.fieldPlan}: {r.requested_plan}
                  </div>
                )}
                {r.requested_teacher && (
                  <div style={{ fontSize: 13, color: EE.sageMuted, marginBottom: 4 }}>
                    {t.requestedTeacher}: {r.requested_teacher}
                  </div>
                )}
                <p style={{ fontSize: 13, color: EE.sageMuted, margin: 0, whiteSpace: 'pre-wrap' }}>{r.details}</p>
                {r.admin_note && (
                  <p style={{ fontSize: 12.5, color: EE.goldDeep, marginTop: 6, fontStyle: 'italic' }}>
                    “{r.admin_note}”
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PlanRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadPlanRequests}
        title={editingRequest ? t.editPlanRequestTitle : t.changePlanBtn}
        description={editingRequest ? t.editPlanRequestDesc : t.changePlanDesc}
        editRequest={editingRequest ?? undefined}
      />
    </div>
  );
}
