'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, Inbox } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { type PlatformRequest } from '@/types/dashboard';
import { useLang } from '@/lib/dashboard/i18n';
import { EE } from '@/lib/dashboard/theme';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { RequestModal } from '@/components/dashboard/RequestModal';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: 'rgba(217,180,95,.18)', fg: '#B08A2E' },
  in_review: { bg: 'rgba(59,130,246,.12)', fg: '#1D4ED8' },
  approved: { bg: 'rgba(16,163,74,.12)', fg: '#0F7A3D' },
  rejected: { bg: 'rgba(220,38,38,.1)', fg: '#B91C1C' },
};

export default function TeacherChangePage() {
  const { t } = useLang();
  const [requests, setRequests] = useState<PlatformRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadRequests = () => {
    apiClient
      .get<PlatformRequest[]>('/requests/me')
      .then(({ data }) => setRequests(data.filter((r) => r.type === 'change_teacher')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const statusLabel = (status: string) =>
    ({
      pending: t.statusPending,
      in_review: t.statusInReview,
      approved: t.statusApproved,
      rejected: t.statusRejected,
    })[status] ?? status;

  return (
    <div>
      <SectionHeader
        title={t.teacherChangeTitle}
        desc={t.teacherChangeDesc}
        action={
          <button
            onClick={() => setOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: EE.emerald,
              color: EE.parchment,
              border: 'none',
              padding: '11px 20px',
              borderRadius: 9,
              fontWeight: 600,
              fontSize: 13.5,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <ArrowRightLeft size={15} />
            {t.teacherChangeTitle}
          </button>
        }
      />

      <h3 style={{ fontFamily: EE.fontHead, fontSize: 15.5, fontWeight: 600, color: EE.ink, marginBottom: 14 }}>
        {t.myRequests}
      </h3>

      {loading ? (
        <p style={{ color: EE.sageMuted, fontSize: 14 }}>{t.loading}</p>
      ) : requests.length === 0 ? (
        <EmptyState icon={Inbox} text={t.noRequests} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map((r) => {
            const colors = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending;
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
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
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
                    {statusLabel(r.status)}
                  </span>
                </div>
                {r.requested_teacher && (
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: EE.ink, marginBottom: 4 }}>
                    {t.requestedTeacher}: {r.requested_teacher}
                  </div>
                )}
                <p style={{ fontSize: 13, color: EE.sageMuted, margin: 0 }}>{r.details}</p>
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

      <RequestModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={loadRequests}
        requestType="change_teacher"
        title={t.teacherChangeTitle}
        description={t.teacherChangeDesc}
        showRequestedTeacher
        detailsLabel={t.teacherChangeReason}
      />
    </div>
  );
}
