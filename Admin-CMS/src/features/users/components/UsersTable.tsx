/**
 * Users table component - simplified version
 */

import { type ColumnDef } from '@tanstack/react-table';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { DataTable, Avatar, StatusBadge, Button } from '@/shared/components';
import { formatDate, formatNumber } from '@/shared/utils';
import type { User } from '../store/usersStore';

interface UsersTableProps {
  users: User[];
  isLoading?: boolean;
  onViewUser?: (user: User) => void;
  onEditUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
  onSelectionChange?: (users: User[]) => void;
}

const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
};

const countryNames: Record<string, string> = {
  KSA: 'Saudi Arabia',
  UAE: 'United Arab Emirates',
};

export function UsersTable({
  users,
  isLoading,
  onViewUser,
  onEditUser,
  onDeleteUser,
  onSelectionChange,
}: UsersTableProps) {
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'firstName',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
            <div>
              <p className="font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'country',
      header: 'Country',
      cell: ({ row }) => (
        <span className="text-gray-600">
          {countryNames[row.original.country] || row.original.country}
        </span>
      ),
    },
    {
      accessorKey: 'organization',
      header: 'Organization',
      cell: ({ row }) => (
        <span className="text-gray-600">{row.original.organization}</span>
      ),
    },
    {
      accessorKey: 'points',
      header: 'Points',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {formatNumber(row.original.points)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge 
          status={statusMap[row.original.status] || 'default'} 
          label={row.original.status} 
        />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-gray-500">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-1">
            {onViewUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewUser(user)}
                title="View user"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onEditUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditUser(user)}
                title="Edit user"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDeleteUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteUser(user)}
                className="text-danger-600 hover:text-danger-700"
                title="Delete user"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={users}
      columns={columns}
      isLoading={isLoading}
      enableRowSelection
      enableSearch
      enableExport
      onSelectionChange={onSelectionChange}
      emptyMessage="No users found"
      searchPlaceholder="Search users..."
    />
  );
}
