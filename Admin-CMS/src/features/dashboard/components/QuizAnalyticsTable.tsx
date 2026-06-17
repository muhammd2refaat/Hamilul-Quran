/**
 * Quiz Analytics Component
 */

import { useMemo } from 'react';
import { Card } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { mockQuizAnalytics, type QuizAnalytics } from '@/mock-data/analytics';

interface QuizAnalyticsTableProps {
  isLoading?: boolean;
}

export function QuizAnalyticsTable({ isLoading }: QuizAnalyticsTableProps) {
  const columns = useMemo<ColumnDef<QuizAnalytics>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Quiz Title',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'usersAttended',
      header: () => <div className="text-center">Users Attended</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-primary-600">
          {(info.getValue() as number).toLocaleString()}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'averageScore',
      header: () => <div className="text-center">Average Score</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-green-600">
          {(info.getValue() as number).toFixed(1)}%
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'completionRate',
      header: () => <div className="text-center">Completion Rate</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-blue-600">
          {(info.getValue() as number).toFixed(1)}%
        </div>
      ),
      meta: { className: 'text-center' },
    },
  ], []);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz Analytics</h2>
      <DataTable
        data={mockQuizAnalytics}
        columns={columns}
        enableSearch={true}
        searchPlaceholder="Search quizzes..."
        emptyMessage="No quiz analytics data found."
      />
    </Card>
  );
}

export default QuizAnalyticsTable;
