/**
 * Subscriptions management page — real per-student plan/status data.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  PauseCircle,
  XCircle,
  GraduationCap,
  Search,
  Pencil,
  Layers,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Card, Button, Modal, Input, Select } from '@/shared/components';
import {
  useSubscriptionsStore,
  type Subscription,
  type SubscriptionStatus,
} from '../store/subscriptionsStore';
import { usePlansStore, getPlanDisplayName } from '@/features/plans/store/plansStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { color: string; icon: React.ElementType }
> = {
  active: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  paused: { color: 'bg-amber-100 text-amber-700', icon: PauseCircle },
  withdrawn: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

interface Row {
  studentId: string;
  studentName: string;
  email: string;
  subscription: Subscription | null;
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {t(`subscriptions.status.${status}`)}
    </span>
  );
}

interface FormState {
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  notes: string;
  sessionsRemaining: string;
}

export function SubscriptionsPage() {
  const { t, i18n } = useTranslation();
  const { subscriptions, fetchSubscriptions, upsertSubscription } = useSubscriptionsStore();
  const { plans, fetchPlans } = usePlansStore();
  const { users, fetchUsers } = useUsersStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | ''>('');
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [form, setForm] = useState<FormState>({
    planId: '',
    status: 'active',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    sessionsRemaining: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    fetchUsers();
    fetchPlans();
  }, [fetchSubscriptions, fetchUsers, fetchPlans]);

  const activePlans = useMemo(() => plans.filter((p) => p.isActive), [plans]);
  const planOptions = useMemo(
    () =>
      activePlans.map((p) => ({
        value: p.id,
        label: `${getPlanDisplayName(p, i18n.language)} — ${p.price} ${p.currency}`,
      })),
    [activePlans, i18n.language]
  );

  const students = useMemo(() => users.filter((u) => u.role === 'STUDENT'), [users]);

  const rows: Row[] = useMemo(() => {
    const byStudentId = new Map(subscriptions.map((s) => [s.studentId, s]));
    return students.map((s) => ({
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`.trim() || s.email,
      email: s.email,
      subscription: byStudentId.get(s.id) ?? null,
    }));
  }, [students, subscriptions]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.studentName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter((r) => r.subscription?.status === statusFilter);
    }
    return list;
  }, [rows, search, statusFilter]);

  const counts = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active').length;
    const paused = subscriptions.filter((s) => s.status === 'paused').length;
    const withdrawn = subscriptions.filter((s) => s.status === 'withdrawn').length;
    return { total: students.length, active, paused, withdrawn };
  }, [subscriptions, students]);

  const openEditModal = (row: Row) => {
    setEditingRow(row);
    setForm({
      planId: row.subscription?.planId ?? '',
      status: row.subscription?.status ?? 'active',
      startDate: row.subscription?.startDate ?? format(new Date(), 'yyyy-MM-dd'),
      notes: row.subscription?.notes ?? '',
      sessionsRemaining:
        row.subscription?.sessionsRemaining !== undefined ? String(row.subscription.sessionsRemaining) : '',
    });
  };

  // A plan must be picked for a brand-new subscription; an existing one can
  // be edited (status/notes/sessions) without necessarily changing its plan.
  const isFormValid = editingRow?.subscription ? true : !!form.planId;

  const handleSave = async () => {
    if (!editingRow || !isFormValid) return;
    setIsSaving(true);
    try {
      await upsertSubscription(editingRow.studentId, {
        plan_id: form.planId || undefined,
        status: form.status,
        start_date: form.startDate,
        notes: form.notes.trim() || undefined,
        sessions_remaining: form.sessionsRemaining !== '' ? Number(form.sessionsRemaining) : undefined,
      });
      toast.success(t('subscriptions.saved'));
      setEditingRow(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('subscriptions.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const pausedDetail = (sub: Subscription) => {
    if (sub.status !== 'paused') return null;
    const since = sub.pausedAt ? format(new Date(sub.pausedAt), 'MMM d, yyyy') : null;
    const remaining = sub.sessionsRemaining;
    return (
      <span className="text-[11px] text-amber-700">
        {since && t('subscriptions.pausedSince', { date: since })}
        {remaining !== undefined && (since ? ' · ' : '') + t('subscriptions.sessionsLeft', { count: remaining })}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('subscriptions.title')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('subscriptions.subtitle')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('users.totalStudents'), value: counts.total, icon: GraduationCap, color: 'bg-primary-50 text-primary-700', iconBg: 'bg-primary-100' },
          { label: t('subscriptions.status.active'), value: counts.active, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100' },
          { label: t('subscriptions.status.paused'), value: counts.paused, icon: PauseCircle, color: 'bg-amber-50 text-amber-700', iconBg: 'bg-amber-100' },
          { label: t('subscriptions.status.withdrawn'), value: counts.withdrawn, icon: XCircle, color: 'bg-red-50 text-red-700', iconBg: 'bg-red-100' },
        ].map(({ label, value, icon: Icon, color, iconBg }) => (
          <Card key={label} className={`flex items-center gap-4 p-4 ${color}`}>
            <div className={`${iconBg} rounded-xl p-2.5`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium opacity-80">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('users.searchNameEmail')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 pe-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | '')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="active">{t('subscriptions.status.active')}</option>
          <option value="paused">{t('subscriptions.status.paused')}</option>
          <option value="withdrawn">{t('subscriptions.status.withdrawn')}</option>
        </select>
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <Card className="p-10 text-center text-gray-400">{t('common.noResults')}</Card>
      ) : (
        <div className="space-y-2">
          {filteredRows.map((row) => (
            <div
              key={row.studentId}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{row.studentName}</p>
                  <p className="text-xs text-gray-500 truncate">{row.email}</p>
                </div>
              </div>

              <div className="text-sm text-gray-700 sm:w-44 truncate">
                {row.subscription
                  ? row.subscription.plan
                    ? getPlanDisplayName(row.subscription.plan, i18n.language)
                    : row.subscription.planName
                  : t('subscriptions.noPlan')}
                {row.subscription?.sessionsRemaining !== undefined && row.subscription.status !== 'paused' && (
                  <div className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {t('subscriptions.sessionsLeft', { count: row.subscription.sessionsRemaining })}
                  </div>
                )}
              </div>

              <div className="sm:w-40">
                {row.subscription ? (
                  <div className="flex flex-col gap-0.5">
                    <StatusBadge status={row.subscription.status} />
                    {pausedDetail(row.subscription)}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">{t('subscriptions.noSubscription')}</span>
                )}
              </div>

              <div className="text-xs text-gray-500 sm:w-32">
                {row.subscription
                  ? format(new Date(row.subscription.startDate), 'MMM d, yyyy')
                  : '—'}
              </div>

              <Button variant="outline" onClick={() => openEditModal(row)}>
                <Pencil className="h-3.5 w-3.5 me-2" /> {t('subscriptions.changeSubscription')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Change subscription modal */}
      <Modal
        isOpen={!!editingRow}
        onClose={() => setEditingRow(null)}
        title={t('subscriptions.changeSubscription')}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setEditingRow(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!isFormValid || isSaving} isLoading={isSaving}>
              {t('common.save')}
            </Button>
          </div>
        }
      >
        {editingRow && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {t('subscriptions.editingFor', { name: editingRow.studentName })}
            </p>
            <Select
              label={t('subscriptions.planName')}
              options={planOptions}
              value={form.planId}
              onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
              placeholder={t('subscriptions.selectPlan')}
              required={!editingRow.subscription}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.status')}
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SubscriptionStatus }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="active">{t('subscriptions.status.active')}</option>
                <option value="paused">{t('subscriptions.status.paused')}</option>
                <option value="withdrawn">{t('subscriptions.status.withdrawn')}</option>
              </select>
            </div>
            <Input
              label={t('subscriptions.startDate')}
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            <Input
              label={t('subscriptions.sessionsRemaining')}
              type="number"
              min={0}
              value={form.sessionsRemaining}
              onChange={(e) => setForm((f) => ({ ...f, sessionsRemaining: e.target.value }))}
              placeholder={t('subscriptions.sessionsRemainingPlaceholder')}
              helperText={t('subscriptions.sessionsRemainingHelp')}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('subscriptions.notes')}
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SubscriptionsPage;
