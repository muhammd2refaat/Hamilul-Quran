/**
 * Organizations page placeholder
 */

import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Edit2 } from 'lucide-react';
import { Button, Card, DataTable, Modal, ConfirmDialog, Input } from '@/shared/components';
import { mockOrganizations, type Organization } from '@/mock-data';
import type { ColumnDef } from '@tanstack/react-table';
import type { Country } from '@/shared/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type OrganizationFormData = {
  name: string;
  country: Country;
  status: 'active' | 'inactive';
};

export const OrganizationsPage: React.FC = () => {
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [organizations, setOrganizations] = useState<Organization[]>(mockOrganizations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    country: 'KSA',
    status: 'active',
  });

  // Get unique countries for filter dropdown
  const countries = useMemo(() => {
    const set = new Set(organizations.map((org) => org.country));
    return Array.from(set);
  }, [organizations]);

  // Handlers
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({ name: '', country: 'KSA', status: 'active' });
    setSelectedOrg(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (org: Organization) => {
    setModalMode('edit');
    setFormData({ name: org.name, country: org.country, status: org.status });
    setSelectedOrg(org);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrg(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (modalMode === 'create') {
      const newOrg: Organization = {
        id: `org-${Date.now()}`,
        name: formData.name,
        country: formData.country,
        userCount: 0,
        activeUserCount: 0,
        status: formData.status,
        totalPoints: 0,
        avgPointsPerUser: 0,
        deletedAt: null,
        createdAt: new Date().toISOString(),
      };
      setOrganizations([...organizations, newOrg]);
      toast.success('Organization created successfully');
    } else if (modalMode === 'edit' && selectedOrg) {
      setOrganizations(
        organizations.map((org) =>
          org.id === selectedOrg.id
            ? { ...org, name: formData.name, country: formData.country, status: formData.status }
            : org
        )
      );
      toast.success('Organization updated successfully');
    }
    handleCloseModal();
  };

  const handleOpenDeleteDialog = (org: Organization) => {
    setSelectedOrg(org);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedOrg(null);
  };

  const handleDelete = () => {
    if (selectedOrg) {
      setOrganizations(organizations.filter((org) => org.id !== selectedOrg.id));
      toast.success('Organization deleted successfully');
    }
    handleCloseDeleteDialog();
  };

  // Filter, search, and sort organizations
  const filteredOrgs = useMemo(() => {
    let orgs = [...organizations];
    if (countryFilter) {
      orgs = orgs.filter((org) => org.country === countryFilter);
    }
    if (search) {
      orgs = orgs.filter((org) => org.name.toLowerCase().includes(search.toLowerCase()));
    }
    // Sort by user count descending
    orgs.sort((a, b) => b.userCount - a.userCount);
    return orgs;
  }, [organizations, countryFilter, search]);

  // Table columns
  const columns = useMemo<ColumnDef<Organization>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => (
        <div className="font-medium text-gray-900">
          {info.getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: 'country',
      header: () => <div className="text-center">Country</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {info.getValue() as string}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'userCount',
      header: () => <div className="text-center">User Count</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {info.getValue() as number}
        </div>
      ),
      enableSorting: true,
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
      header: () => <div className="text-center">Creation Date</div>,
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
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-600 mt-1">Manage healthcare organizations and institutions</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
          Add Organization
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by organization name..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            style={{ maxWidth: '320px' }}
          />
          <div className="flex gap-2 items-center">
            <select
              value={countryFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCountryFilter(e.target.value)}
              className="min-w-[155px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '155px' }}
            >
              <option value="">All Countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
        </div>
        <DataTable
          data={filteredOrgs}
          columns={columns}
          enableSearch={false}
          emptyMessage="No organizations found."
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Add Organization' : 'Edit Organization'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {modalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Organization Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter organization name"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <select
              value={formData.country}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, country: e.target.value as Country })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="KSA">KSA</option>
              <option value="UAE">UAE</option>
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
        title="Delete Organization"
        message={`Are you sure you want to delete "${selectedOrg?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default OrganizationsPage;
