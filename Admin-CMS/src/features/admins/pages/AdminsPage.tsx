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

export const AdminsPage: React.FC = () => {
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

    if (modalMode === 'create' && !formData.password) {
      toast.error('Password is required');
      return;
    }

    try {
      if (modalMode === 'create') {
        await addAdmin({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
        });
        toast.success('Admin created successfully');
      } else if (modalMode === 'edit' && selectedAdmin) {
        await updateAdmin(selectedAdmin.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
        });
        toast.success('Admin updated successfully');
      }
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to save admin');
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
        header: 'Name',
        cell: (info) => (
          <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (info) => (
          <div className="text-sm text-gray-700">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'role',
        header: () => <div className="text-center">Role</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-700">{info.getValue() as string}</div>
        ),
        meta: { className: 'text-center' },
      },
      {
        accessorKey: 'status',
        header: () => <div className="text-center">Status</div>,
        cell: (info) => {
          const status = info.getValue() as string;
          const statusConfig = {
            active: { label: 'Active', color: 'bg-green-100 text-green-800' },
            inactive: { label: 'Inactive', color: 'bg-red-50 text-red-600' },
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
        header: () => <div className="text-center">Created At</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-600">
            {format(new Date(info.getValue() as string), 'MMM d, yyyy')}
          </div>
        ),
        meta: { className: 'text-center' },
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => handleOpenEditModal(row.original)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => handleOpenDeleteDialog(row.original)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        ),
        meta: { className: 'text-right' },
      },
    ],
    []
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
          <h1 className="text-2xl font-bold text-gray-900">Admins</h1>
          <p className="text-gray-600 mt-1">
            Manage admin users and their permissions
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
          Add Admin
        </Button>
      </div>

      <Card className="p-6">
        <DataTable
          data={filteredAdmins}
          columns={columns}
          isLoading={isLoading}
          enableSearch={false}
          emptyMessage="No admins found."
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Add Admin' : 'Edit Admin'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim() || !formData.email.trim()}>
              {modalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter admin name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
            required
          />
          {modalMode === 'create' && (
            <Input
              label="Password"
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
              required
            />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, role: e.target.value as 'Super Admin' | 'Admin' })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
        title="Delete Admin"
        message={`Are you sure you want to delete "${selectedAdmin?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
