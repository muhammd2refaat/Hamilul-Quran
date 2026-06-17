/**
 * User Engagement Analytics Table Component
 */

import { useMemo } from 'react';
import { Card } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { mockUsers } from '@/mock-data/users';

type UserEngagement = {
  id: string;
  name: string;
  email: string;
  organization: string;
  country: string;
  points: number;
  articlesViewed: number;
  webinarsAttended: number;
  storiesSubmitted: number;
  webinarsRegistered: number;
  rank: number;
};

interface UserEngagementTableProps {
  isLoading?: boolean;
}

export function UserEngagementTable({ isLoading }: UserEngagementTableProps) {
  const userEngagementData: UserEngagement[] = useMemo(() => {
    return mockUsers.map((user) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      organization: user.organization,
      country: user.country,
      points: user.points,
      articlesViewed: user.articlesViewed,
      webinarsAttended: user.webinarsAttended,
      storiesSubmitted: user.storiesSubmitted,
      webinarsRegistered: user.webinarsRegistered,
      rank: user.rank,
    }));
  }, []);

  const columns = useMemo<ColumnDef<UserEngagement>[]>(() => [
    {
      accessorKey: 'rank',
      header: () => <div className="text-center">Rank</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-primary-600">
          #{info.getValue() as number}
        </div>
      ),
      meta: { className: 'text-center' },
    },
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
        <div className="text-sm text-gray-600">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'organization',
      header: 'Organization',
      cell: (info) => (
        <div className="text-sm text-gray-600">{info.getValue() as string}</div>
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
      accessorKey: 'points',
      header: () => <div className="text-center">Reward Points</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-primary-600">
          {(info.getValue() as number).toLocaleString()}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'articlesViewed',
      header: () => <div className="text-center">Articles Viewed</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">{info.getValue() as number}</div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'webinarsAttended',
      header: () => <div className="text-center">Webinars Attended</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">{info.getValue() as number}</div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'storiesSubmitted',
      header: () => <div className="text-center">Stories Submitted</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">{info.getValue() as number}</div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'webinarsRegistered',
      header: () => <div className="text-center">Webinars Registered</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">{info.getValue() as number}</div>
      ),
      meta: { className: 'text-center' },
    },
  ], []);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">User Status Analytics</h2>
      <DataTable
        data={userEngagementData}
        columns={columns}
        enableSearch={true}
        searchPlaceholder="Search users..."
        emptyMessage="No user engagement data found."
      />
    </Card>
  );
}

export default UserEngagementTable;
