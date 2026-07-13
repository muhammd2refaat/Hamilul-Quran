/**
 * Admins management page (Super Admin only)
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button, Card, DataTable, Modal, ConfirmDialog, Input } from '@/shared/components';
import { useAdminsStore } from '../store';
import type { Admin, AdminFormData } from '../types';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export const AdminsPage: React.FC = () => {
  const { t } = useTranslation();
  const { admins, isLoading, fetchAdmins, addAdmin, updateAdmin, deleteAdmin } =
    useAdminsStore();

  // Removed statusFilter state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<AdminFormData>({
    name: '',
    email: '',
    password: '',
    role: 'Admin',
    status: 'active',
  });

  // Fetch admins on mount
  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Handlers
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Admin',
      status: 'active',
    });
    setSelectedAdmin(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (admin: Admin) => {
    setModalMode('edit');
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAdmin(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (modalMode === 'create') {
        await addAdmin({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          password: formData.password || undefined,
        });
        toast.success('Admin created successfully');
      } else if (modalMode === 'edit' && selectedAdmin) {
        await updateAdmin(selectedAdmin.id, {
          name: formData.name,
          role: formData.role,
          status: formData.status,
        });
        toast.success('Admin updated successfully');
      }
      handleCloseModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save admin');
    }
  };

  const handleOpenDeleteDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedAdmin(null);
  };

  const handleDelete = async () => {
    if (!selectedAdmin) return;

    try {
      await deleteAdmin(selectedAdmin.id);
      toast.success('Admin deleted successfully');
      handleCloseDeleteDialog();
    } catch (error) {
      toast.error('Failed to delete admin');
    }
  };

  // Table columns
  const columns = useMemo<ColumnDef<Admin>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('common.name'),
        cell: (info) => (
          <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'email',
        header: t('common.email'),
        cell: (info) => (
          <div className="text-sm text-gray-700">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'role',
        header: () => <div className="text-center">{t('common.role')}</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-700">{info.getValue() as string}</div>
        ),
        meta: { className: 'text-center' },
      },
      {
        accessorKey: 'status',
        header: () => <div className="text-center">{t('common.status')}</div>,
        cell: (info) => {
          const status = info.getValue() as string;
          const statusConfig = {
            active: { label: t('status.active'), color: 'bg-green-100 text-green-800' },
            inactive: { label: t('status.inactive'), color: 'bg-red-50 text-red-600' },
          };
          const config = statusConfig[status as 'active' | 'inactive'];
          return (
            <div className="flex justify-center">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
            </div>
          );
        },
        meta: { className: 'text-center' },
      },
      {
        accessorKey: 'createdAt',
        header: () => <div className="text-center">{t('common.createdAt')}</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-600">
            {format(new Date(info.getValue() as string), 'MMM d, yyyy')}
          </div>
        ),
        meta: { className: 'text-center' },
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{t('common.actions')}</div>,
        cell: ({ row }) => (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => handleOpenEditModal(row.original)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              {t('common.edit')}
            </button>
            <button
              onClick={() => handleOpenDeleteDialog(row.original)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </button>
          </div>
        ),
        meta: { className: 'text-right' },
      },
    ],
    [t]
  );

  // Sort admins by created at (newest first)
  const filteredAdmins = useMemo(() => {
    return [...admins].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [admins]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admins.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('admins.subtitle')}
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
          {t('admins.addAdmin')}
        </Button>
      </div>

      <Card className="p-6">
        <DataTable
          data={filteredAdmins}
          columns={columns}
          isLoading={isLoading}
          enableSearch={false}
          emptyMessage={t('admins.noneFound')}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? t('admins.addAdmin') : t('admins.editAdmin')}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCloseModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim() || !formData.email.trim()}>
              {modalMode === 'create' ? t('common.create') : t('common.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('common.name')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('admins.namePlaceholder')}
            required
          />
          <Input
            label={t('common.email')}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder={t('admins.emailPlaceholder')}
            required
            disabled={modalMode === 'edit'}
          />
          {modalMode === 'create' && (
            <Input
              label={t('admins.password')}
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={t('admins.passwordPlaceholder')}
              helperText={t('admins.passwordHelper')}
            />
          )}
          {modalMode === 'edit' && (
            <p className="text-xs text-gray-500 -mt-2">
              {t('admins.emailImmutable')}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.role')}
            </label>
            <select
              value={formData.role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, role: e.target.value as 'Super Admin' | 'Admin' })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="Super Admin">{t('admins.superAdmin')}</option>
              <option value="Admin">{t('admins.admin')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.status')}
            </label>
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
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        onCancel={handleCloseDeleteDialog}
        title={t('admins.deleteTitle')}
        message={t('admins.deleteMessage', { name: selectedAdmin?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
      />
    </div>
  );
};
