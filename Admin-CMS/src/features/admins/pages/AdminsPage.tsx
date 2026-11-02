/**
 * Admins page. Everyone sees the list; only the Super Admin can add, edit,
 * delete or reset the password of an admin (the backend enforces it). The
 * Super Admin account itself can't be deleted or deactivated.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, KeyRound, Mail, History, Info } from 'lucide-react';
import { Button, Card, DataTable, Modal, ConfirmDialog, Input } from '@/shared/components';
import { useAuthStore } from '@/features/auth';
import { useAdminsStore } from '../store';
import type { Admin, AdminFormData } from '../types';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

const EMPTY_FORM: AdminFormData = { firstName: '', lastName: '', email: '', status: 'active' };

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message || fallback;
}

function utc(iso: string): Date {
  // The API sends naive UTC timestamps.
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
}

function EmailUsageCard() {
  const { t } = useTranslation();
  const { emailUsage, fetchEmailUsage } = useAdminsStore();
  useEffect(() => {
    fetchEmailUsage().catch(() => undefined);
  }, [fetchEmailUsage]);
  if (!emailUsage) return null;
  const pct = Math.min(100, (emailUsage.sent_today / emailUsage.daily_cap) * 100);
  const cutoffPct = (emailUsage.normal_cutoff / emailUsage.daily_cap) * 100;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">{t('admins.emailUsage')}</h2>
        </div>
        {!emailUsage.enabled && <span className="text-xs text-gray-500">{t('admins.emailOff')}</span>}
      </div>
      <p className="text-2xl font-extrabold text-gray-900">
        {emailUsage.sent_today} <span className="text-sm font-medium text-gray-500">/ {emailUsage.daily_cap}</span>
      </p>
      <div className="relative h-2 rounded-full bg-gray-100 mt-2 overflow-hidden">
        <div
          className={`h-full ${emailUsage.sent_today >= emailUsage.normal_cutoff ? 'bg-amber-500' : 'bg-primary-500'}`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute top-0 h-full w-0.5 bg-gray-400" style={{ insetInlineStart: `${cutoffPct}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {t('admins.emailUsageHelp', { cutoff: emailUsage.normal_cutoff, cap: emailUsage.daily_cap })}
      </p>
      {emailUsage.blocked_today > 0 && (
        <p className="text-xs font-medium text-amber-700 mt-1">{t('admins.emailBlocked', { count: emailUsage.blocked_today })}</p>
      )}
    </Card>
  );
}

function AuditLogCard() {
  const { t } = useTranslation();
  const { audit, fetchAudit } = useAdminsStore();
  useEffect(() => {
    fetchAudit().catch(() => undefined);
  }, [fetchAudit]);
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-5 w-5 text-primary-600" />
        <h2 className="font-semibold text-gray-900">{t('admins.activity')}</h2>
      </div>
      {audit.length === 0 ? (
        <p className="text-sm text-gray-400">{t('admins.noActivity')}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {audit.map((e) => (
            <li key={e.id} className="py-2.5 text-sm flex flex-wrap gap-x-2 gap-y-0.5">
              <span className="text-gray-500 tabular-nums w-36 flex-shrink-0">
                {format(utc(e.created_at), 'd MMM yyyy, HH:mm')}
              </span>
              <span className="text-gray-900">
                {t(`admins.action.${e.action}`, {
                  actor: e.actor_email,
                  target: e.target_email ?? '—',
                  defaultValue: `${e.actor_email}: ${e.action} ${e.target_email ?? ''}`,
                })}
                {e.details && e.action === 'updated' && <span className="text-gray-500"> ({e.details})</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export const AdminsPage: React.FC = () => {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = !!me?.isSuperAdmin;
  const { admins, isLoading, fetchAdmins, addAdmin, updateAdmin, deleteAdmin, resetPassword, fetchAudit, fetchEmailUsage } =
    useAdminsStore();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Admin | null>(null);
  const [confirm, setConfirm] = useState<'delete' | 'reset' | null>(null);
  const [formData, setFormData] = useState<AdminFormData>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const refreshSide = () => {
    if (!isSuperAdmin) return;
    fetchAudit().catch(() => undefined);
    fetchEmailUsage().catch(() => undefined);
  };

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setSelected(null);
    setModalMode('create');
  };

  const openEdit = (admin: Admin) => {
    setSelected(admin);
    setFormData({ firstName: admin.firstName, lastName: admin.lastName, email: admin.email, status: admin.status });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const emailOutcome = (sent: boolean, email: string) => {
    if (sent) toast.success(t('admins.tempPasswordSent', { email }), { duration: 6000 });
    else toast.error(t('admins.tempPasswordNotSent'), { duration: 9000 });
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      if (modalMode === 'create') {
        const sent = await addAdmin({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
        });
        emailOutcome(sent, formData.email.trim());
      } else if (modalMode === 'edit' && selected) {
        await updateAdmin(selected.id, {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          ...(selected.isSuperAdmin ? {} : { status: formData.status }),
        });
        toast.success(t('admins.saved'));
      }
      closeModal();
      refreshSide();
    } catch (error) {
      toast.error(errorMessage(error, t('admins.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      if (confirm === 'delete') {
        await deleteAdmin(selected.id);
        toast.success(t('admins.deleted'));
      } else if (confirm === 'reset') {
        emailOutcome(await resetPassword(selected.id), selected.email);
      }
      setConfirm(null);
      setSelected(null);
      refreshSide();
    } catch (error) {
      toast.error(errorMessage(error, t('admins.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<Admin>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('common.name'),
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1.5 font-medium text-gray-900">
            {row.original.name}
            {row.original.isSuperAdmin && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                {t('admins.superAdmin')}
              </span>
            )}
            {row.original.id === me?.id && <span className="text-xs font-normal text-gray-400">({t('admins.you')})</span>}
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: t('common.email'),
        cell: (info) => <div className="text-sm text-gray-700">{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'status',
        header: () => <div className="text-center">{t('common.status')}</div>,
        cell: ({ row }) => {
          const a = row.original;
          let label = t('status.active');
          let color = 'bg-green-100 text-green-800';
          let hint: string | null = null;
          if (a.status === 'inactive') {
            label = t('status.inactive');
            color = 'bg-red-50 text-red-600';
          } else if (a.mustChangePassword && a.tempPasswordExpiresAt) {
            const expires = utc(a.tempPasswordExpiresAt);
            if (expires < new Date()) {
              label = t('admins.inviteExpired');
              color = 'bg-gray-100 text-gray-600';
            } else {
              label = t('admins.invitePending');
              color = 'bg-amber-50 text-amber-800';
              hint = t('admins.expiresIn', { time: formatDistanceToNow(expires) });
            }
          } else if (a.mustChangePassword) {
            label = t('admins.mustChange');
            color = 'bg-amber-50 text-amber-800';
          }
          return (
            <div className="flex flex-col items-center gap-0.5">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>
              {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
            </div>
          );
        },
        meta: { className: 'text-center' },
      },
      {
        accessorKey: 'createdAt',
        header: () => <div className="text-center">{t('common.createdAt')}</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-600">{format(utc(info.getValue() as string), 'MMM d, yyyy')}</div>
        ),
        meta: { className: 'text-center' },
      },
      ...(isSuperAdmin
        ? [
            {
              id: 'actions',
              header: () => <div className="text-center">{t('common.actions')}</div>,
              cell: ({ row }: { row: { original: Admin } }) => {
                const a = row.original;
                return (
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                      {t('common.edit')}
                    </button>
                    {!a.isSuperAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setSelected(a);
                            setConfirm('reset');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg"
                        >
                          <KeyRound className="h-4 w-4" />
                          {a.mustChangePassword ? t('admins.resendInvite') : t('admins.resetPassword')}
                        </button>
                        <button
                          onClick={() => {
                            setSelected(a);
                            setConfirm('delete');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('common.delete')}
                        </button>
                      </>
                    )}
                  </div>
                );
              },
              meta: { className: 'text-center' },
            } as ColumnDef<Admin>,
          ]
        : []),
    ],
    [t, isSuperAdmin, me?.id]
  );

  const sorted = useMemo(
    () =>
      [...admins].sort((a, b) =>
        a.isSuperAdmin !== b.isSuperAdmin ? (a.isSuperAdmin ? -1 : 1) : utc(b.createdAt).getTime() - utc(a.createdAt).getTime()
      ),
    [admins]
  );

  const emailValid = /^\S+@\S+\.\S+$/.test(formData.email.trim());
  const canSave = formData.firstName.trim() && (modalMode === 'edit' || emailValid);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admins.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admins.subtitle')}</p>
        </div>
        {isSuperAdmin && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            {t('admins.addAdmin')}
          </Button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {t('admins.superAdminOnly')}
        </div>
      )}

      <Card className="p-6">
        <DataTable data={sorted} columns={columns} isLoading={isLoading} enableSearch={false} emptyMessage={t('admins.noneFound')} />
      </Card>

      {isSuperAdmin && (
        <div className="grid gap-6 lg:grid-cols-3">
          <EmailUsageCard />
          <div className="lg:col-span-2">
            <AuditLogCard />
          </div>
        </div>
      )}

      <Modal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'create' ? t('admins.addAdmin') : t('admins.editAdmin')}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} isLoading={busy} disabled={!canSave}>
              {modalMode === 'create' ? t('admins.createAndEmail') : t('common.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('users.firstName')}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label={t('users.lastName')}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <Input
            label={t('common.email')}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder={t('admins.emailPlaceholder')}
            required
            disabled={modalMode === 'edit'}
            helperText={modalMode === 'edit' ? t('admins.emailImmutable') : undefined}
          />
          {modalMode === 'create' && (
            <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
              <Mail className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary-600" />
              {t('admins.tempPasswordNote', { hours: 24 })}
            </div>
          )}
          {modalMode === 'edit' && !selected?.isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
              <select
                value={formData.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="active">{t('status.active')}</option>
                <option value="inactive">{t('status.inactive')}</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">{t('admins.inactiveHelp')}</p>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
        isLoading={busy}
        title={confirm === 'delete' ? t('admins.deleteTitle') : t('admins.resetTitle')}
        message={
          confirm === 'delete'
            ? t('admins.deleteMessage', { name: selected?.name })
            : t('admins.resetMessage', { name: selected?.name, email: selected?.email, hours: 24 })
        }
        confirmText={confirm === 'delete' ? t('common.delete') : t('admins.sendNewPassword')}
        cancelText={t('common.cancel')}
        variant={confirm === 'delete' ? 'danger' : 'warning'}
      />
    </div>
  );
};
