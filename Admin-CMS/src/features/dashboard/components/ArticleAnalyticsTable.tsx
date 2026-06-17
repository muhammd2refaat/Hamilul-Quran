/**
 * Article Analytics Component
 */

import { useMemo } from 'react';
import { Card } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tantml/react-table';
import { mockArticleAnalytics, type ArticleAnalytics } from '@/mock-data/analytics';

interface ArticleAnalyticsTableProps {
  isLoading?: boolean;
}

export function ArticleAnalyticsTable({ isLoading }: ArticleAnalyticsTableProps) {
  const columns = useMemo<ColumnDef<ArticleAnalytics>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Article Title',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'totalViews',
      header: () => <div className="text-center">Total Views</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-primary-600">
          {(info.getValue() as number).toLocaleString()}
        </div>
      ),
      meta: { className: 'text-center' },
    },
  ], []);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Article Analytics</h2>
      <p className="text-sm text-gray-600 mb-4">Total views by users</p>
      <DataTable
        data={mockArticleAnalytics}
        columns={columns}
        enableSearch={true}
        searchPlaceholder="Search articles..."
        emptyMessage="No article analytics data found."
      />
    </Card>
  );
}

export default ArticleAnalyticsTable;
