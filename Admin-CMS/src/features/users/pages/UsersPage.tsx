/**
 * Users management page
 */

import { useMemo, useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Button, Card, DataTable, Modal, ConfirmDialog, Input } from '@/shared/components';
import { mockUsers, type User } from '@/mock-data/users';

import type { ColumnDef } from '@tanstack/react-table';
import type { Country, Gender, UserStatus } from '@/shared/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Country-city mapping
const COUNTRY_CITIES: Record<string, string[]> = {
  'KSA': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar'],
  'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
};

type UserFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  country: Country;
  city: string;
  organization: string;
  organizationId: string;
  gender: Gender;
  dateOfBirth: string;
  status: UserStatus;
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    country: 'KSA',
    city: '',
    organization: '',
    organizationId: '',
    gender: 'Male',
    dateOfBirth: '',
    status: 'active',
  });

  // Get available cities based on selected country
  const availableCities = useMemo(() => {
    return COUNTRY_CITIES[formData.country] || [];
  }, [formData.country]);

  // Get unique values for filters
  const countries = useMemo(() => {
    const set = new Set(users.map((user) => user.country));
    return Array.from(set);
  }, [users]);

  const organizations = useMemo(() => {
    const set = new Set(users.map((user) => user.organization));
    return Array.from(set).sort();
  }, [users]);

  // Handlers
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      title: '',
      country: 'KSA',
      city: '',
      organization: '',
      organizationId: '',
      gender: 'Male',
      dateOfBirth: '',
      status: 'active',
    });
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setModalMode('edit');
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      title: user.title || '',
      country: user.country,
      city: user.city,
      organization: user.organization,
      organizationId: user.organizationId,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      status: user.status,
    });
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSave = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (modalMode === 'create') {
      const newUser: User = {
        id: `user-${Date.now()}`,
        ...formData,
        points: 0,
        articlesViewed: 0,
        webinarsAttended: 0,
        storiesSubmitted: 0,
        webinarsRegistered: 0,
        quizzesTaken: 0,
        rank: users.length + 1,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
      setUsers([...users, newUser]);
      toast.success('User created successfully');
    } else if (modalMode === 'edit' && selectedUser) {
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id ? { ...user, ...formData } : user
        )
      );
      toast.success('User updated successfully');
    }
    handleCloseModal();
  };

  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDelete = () => {
    if (selectedUser) {
      setUsers(users.filter((user) => user.id !== selectedUser.id));
      toast.success('User deleted successfully');
    }
    handleCloseDeleteDialog();
  };

  // Filter, search, and sort users
  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // Filter by search (name or email)
    if (search) {
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(search.toLowerCase()) ||
          user.lastName.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by country
    if (countryFilter) {
      filtered = filtered.filter((user) => user.country === countryFilter);
    }

    // Filter by organization
    if (organizationFilter) {
      filtered = filtered.filter((user) => user.organization === organizationFilter);
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    // Sort by reward points descending
    filtered.sort((a, b) => b.points - a.points);

    return filtered;
  }, [users, search, countryFilter, organizationFilter, statusFilter]);

  // Table columns
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">
            {`${row.original.firstName} ${row.original.lastName}`}
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (info) => (
          <div className="text-sm text-gray-600">
            {info.getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: () => <div className="text-center">Phone</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-600">
            {info.getValue() as string}
          </div>
        ),
        meta: { className: 'text-center' },
      },
      {
        accessorKey: 'title',
        header: () => <div className="text-center">Title</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-600">
            {info.getValue() as string}
          </div>
        ),
        meta: { className: 'text-center' },
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
        accessorKey: 'city',
        header: () => <div className="text-center">City</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-600">
            {info.getValue() as string}
          </div>
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
            pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
          };
          const config = statusConfig[status as keyof typeof statusConfig];
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
        accessorKey: 'organization',
        header: () => <div className="text-center">Organization</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-600">
            {info.getValue() as string}
          </div>
        ),
        meta: { className: 'text-center' },
      },
      {
        accessorKey: 'gender',
        header: () => <div className="text-center">Gender</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-600">
            {info.getValue() as string}
          </div>
        ),
        meta: { className: 'text-center' },
      },
      {
        accessorKey: 'points',
        header: () => <div className="text-center">Reward Points</div>,
        cell: (info) => (
          <div className="text-center">
            <span className="font-semibold text-primary-600">
              {info.getValue() as number}
            </span>
          </div>
        ),
        enableSorting: true,
        meta: { className: 'text-center' },
      },
      {
        accessorKey: 'dateOfBirth',
        header: () => <div className="text-center">Date of Birth</div>,
        cell: (info) => (
          <div className="text-center text-sm text-gray-600">
            {format(new Date(info.getValue() as string), 'MMM d, yyyy')}
          </div>
        ),
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
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">
            Manage platform users and assigning access permissions.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreateModal}>
          Add User
        </Button>
      </div>

      {/* Users Table with Filters/Search above */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 w-full justify-between">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full md:w-80 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              style={{ maxWidth: '320px' }}
            />
            <div className="flex gap-4">
              <select
                value={countryFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setCountryFilter(e.target.value)
                }
                className="min-w-[155px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                style={{ maxWidth: '155px' }}
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <select
                value={organizationFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setOrganizationFilter(e.target.value)
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                style={{ maxWidth: '155px' }}
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setStatusFilter(e.target.value)
                }
                className="min-w-[155px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                style={{ maxWidth: '155px' }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
        <DataTable
          data={filteredUsers}
          columns={columns}
          enableSearch={false}
          emptyMessage="No users found."
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Add User' : 'Edit User'}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.firstName.trim() ||
                !formData.lastName.trim() ||
                !formData.email.trim()
              }
            >
              {modalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Enter first name"
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Enter last name"
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email"
            required
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
          />
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter job title"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                value={formData.country}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const newCountry = e.target.value as Country;
                  setFormData({ ...formData, country: newCountry, city: '' });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="KSA">KSA</option>
                <option value="UAE">UAE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <select
                value={formData.city}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a city</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
            <Input
              label="Organization"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              placeholder="Enter organization name"
            />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, gender: e.target.value as Gender })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, status: e.target.value as UserStatus })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
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
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.firstName} ${selectedUser?.lastName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default UsersPage;
