/**
 * Plans page — admin CRUD for subscription plans (name, sessions/week,
 * session duration, price). Students subscribe to these via the
 * Subscriptions page; teachers are never assigned a plan.
 */

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Pencil, Ban, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Card, Button, Modal, Input, ConfirmDialog } from '@/shared/components';
import { usePlansStore, type Plan } from '../store/plansStore';

interface FormState {
  name: string;
  sessionsPerWeek: string;
  sessionDurationMinutes: string;
  price: string;
  currency: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  sessionsPerWeek: '1',
  sessionDurationMinutes: '30',
  price: '',
  currency: 'EGP',
};

export function PlansPage() {
  const { t } = useTranslation();
  const { plans, isLoading, fetchPlans, createPlan, updatePlan, deactivatePlan } = usePlansStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deactivating, setDeactivating] = useState<Plan | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.isActive === b.isActive ? Number(a.price) - Number(b.price) : a.isActive ? -1 : 1)),
    [plans]
  );

  const openCreateModal = () => {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      sessionsPerWeek: String(plan.sessionsPerWeek),
      sessionDurationMinutes: String(plan.sessionDurationMinutes),
      price: plan.price,
      currency: plan.currency,
    });
    setIsModalOpen(true);
  };

  const isFormValid =
    form.name.trim() &&
    Number(form.sessionsPerWeek) > 0 &&
    Number(form.sessionDurationMinutes) > 0 &&
    Number(form.price) >= 0;

  const handleSave = async () => {
    if (!isFormValid) return;
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sessions_per_week: Number(form.sessionsPerWeek),
        session_duration_minutes: Number(form.sessionDurationMinutes),
        price: Number(form.price),
        currency: form.currency.trim() || 'EGP',
      };
      if (editingPlan) {
        await updatePlan(editingPlan.id, payload);
      } else {
        await createPlan(payload);
      }
      toast.success(editingPlan ? t('plans.updated') : t('plans.created'));
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('plans.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivating) return;
    setIsDeactivating(true);
    try {
      await deactivatePlan(deactivating.id);
      toast.success(t('plans.deactivated'));
      setDeactivating(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('plans.deactivateFailed'));
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (plan: Plan) => {
    try {
      await updatePlan(plan.id, { is_active: true });
      toast.success(t('plans.reactivated'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('plans.saveFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('plans.title')}</h1>
          <p className="text-gray-600 mt-1">{t('plans.subtitle')}</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 me-2" /> {t('plans.addPlan')}
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-10 text-center text-gray-400">{t('common.loading')}</Card>
      ) : sortedPlans.length === 0 ? (
        <Card className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">{t('plans.noneTitle')}</h3>
          <p className="text-gray-500 mt-2 max-w-sm">{t('plans.noneDesc')}</p>
          <Button className="mt-6" onClick={openCreateModal}>
            <Plus className="h-4 w-4 me-2" /> {t('plans.addPlan')}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 ${
                plan.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-gray-900 leading-snug">{plan.name}</h3>
                {!plan.isActive && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                    {t('plans.inactive')}
                  </span>
                )}
              </div>

              <div className="text-2xl font-bold text-primary-700">
                {plan.price} <span className="text-sm font-medium text-gray-400">{plan.currency}</span>
              </div>

              <div className="text-sm text-gray-500 flex items-center gap-3">
                <span>{t('plans.perWeek', { count: plan.sessionsPerWeek })}</span>
                <span>·</span>
                <span>{t('plans.minutesPerSession', { count: plan.sessionDurationMinutes })}</span>
              </div>

              <div className="flex items-center gap-2 pt-2 mt-auto border-t border-gray-100">
                <button
                  onClick={() => openEditModal(plan)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
                </button>
                {plan.isActive ? (
                  <button
                    onClick={() => setDeactivating(plan)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Ban className="h-3.5 w-3.5" /> {t('plans.deactivate')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivate(plan)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('plans.reactivate')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? t('plans.editTitle') : t('plans.createTitle')}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!isFormValid || isSaving} isLoading={isSaving}>
              {t('common.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('plans.name')}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('plans.namePlaceholder')}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('plans.sessionsPerWeek')}
              type="number"
              min={1}
              value={form.sessionsPerWeek}
              onChange={(e) => setForm((f) => ({ ...f, sessionsPerWeek: e.target.value }))}
              required
            />
            <Input
              label={t('plans.sessionDuration')}
              type="number"
              min={1}
              step={5}
              value={form.sessionDurationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, sessionDurationMinutes: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('plans.price')}
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
            />
            <Input
              label={t('plans.currency')}
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              maxLength={8}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deactivating}
        onClose={() => setDeactivating(null)}
        onCancel={() => setDeactivating(null)}
        onConfirm={handleDeactivate}
        title={t('plans.deactivateTitle')}
        message={t('plans.deactivateMessage', { name: deactivating?.name })}
        confirmText={t('plans.deactivate')}
        variant="danger"
        isLoading={isDeactivating}
      />
    </div>
  );
}

export default PlansPage;
