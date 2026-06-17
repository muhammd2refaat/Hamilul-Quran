/**
 * Story Analytics Component
 */

import { useMemo } from 'react';
import { Card } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { mockStoryAnalytics, type StoryAnalytics } from '@/mock-data/analytics';
import { format } from 'date-fns';

interface StoryAnalyticsTableProps {
  isLoading?: boolean;
}

export function StoryAnalyticsTable({ isLoading }: StoryAnalyticsTableProps) {
  const columns = useMemo<ColumnDef<StoryAnalytics>[]>(() => [
    {
      accessorKey: 'userName',
      header: 'User Name',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'userEmail',
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
      accessorKey: 'title',
      header: 'Story Title',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'submittedAt',
      header: () => <div className="text-center">Submitted At</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {format(new Date(info.getValue() as string), 'MMM d, yyyy')}
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
          approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
          pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
          rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
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
  ], []);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Story Analytics</h2>
      <p className="text-sm text-gray-600 mb-4">Total stories submitted by users ({mockStoryAnalytics.length})</p>
      <DataTable
        data={mockStoryAnalytics}
        columns={columns}
        enableSearch={true}
        searchPlaceholder="Search stories..."
        emptyMessage="No story analytics data found."
      />
    </Card>
  );
}

export default StoryAnalyticsTable;
