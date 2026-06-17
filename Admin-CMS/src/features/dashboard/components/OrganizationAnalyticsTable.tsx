/**
 * Organization Analytics Table Component
 */

import { useMemo } from 'react';
import { Card } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { mockOrganizations } from '@/mock-data/organizations';

type OrgAnalytics = {
  id: string;
  name: string;
  country: string;
  totalUsers: number;
  activeUsers: number;
  totalPoints: number;
  avgPointsPerUser: number;
  status: string;
};

interface OrganizationAnalyticsTableProps {
  isLoading?: boolean;
}

export function OrganizationAnalyticsTable({ isLoading }: OrganizationAnalyticsTableProps) {
  const organizationData: OrgAnalytics[] = useMemo(() => {
    return mockOrganizations
      .map((org) => ({
        id: org.id,
        name: org.name,
        country: org.country,
        totalUsers: org.userCount,
        activeUsers: org.activeUserCount,
        totalPoints: org.totalPoints,
        avgPointsPerUser: org.avgPointsPerUser,
        status: org.status,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, []);

  const columns = useMemo<ColumnDef<OrgAnalytics>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Organization Name',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'country',
      header: () => <div className="text-center">Country</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">{info.getValue() as string}</div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'totalUsers',
      header: () => <div className="text-center">Total Users</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-gray-900">
          {(info.getValue() as number).toLocaleString()}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'activeUsers',
      header: () => <div className="text-center">Active Users</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-green-600">
          {(info.getValue() as number).toLocaleString()}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'totalPoints',
      header: () => <div className="text-center">Total Points</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-primary-600">
          {(info.getValue() as number).toLocaleString()}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'avgPointsPerUser',
      header: () => <div className="text-center">Avg Points/User</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {(info.getValue() as number).toLocaleString()}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">Status</div>,
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
        );
      },
      meta: { className: 'text-center' },
    },
  ], []);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Analytics</h2>
      <p className="text-sm text-gray-600 mb-4">Organizations ranked by total points (Leaderboard)</p>
      <DataTable
        data={organizationData}
        columns={columns}
        enableSearch={true}
        searchPlaceholder="Search organizations..."
        emptyMessage="No organization data found."
      />
    </Card>
  );
}

export default OrganizationAnalyticsTable;
