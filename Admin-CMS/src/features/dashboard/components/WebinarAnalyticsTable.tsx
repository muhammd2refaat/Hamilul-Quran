/**
 * Webinar Analytics Component
 */

import { useMemo, useState } from 'react';
import { Card, Modal } from '@/shared/components';
import { DataTable } from '@/shared/components/DataTable/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { mockWebinarAnalytics, type WebinarAnalytics, type WebinarAttendee } from '@/mock-data/analytics';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';

interface WebinarAnalyticsTableProps {
  isLoading?: boolean;
}

export function WebinarAnalyticsTable({ isLoading }: WebinarAnalyticsTableProps) {
  const [selectedWebinar, setSelectedWebinar] = useState<WebinarAnalytics | null>(null);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);

  const handleViewAttendees = (webinar: WebinarAnalytics) => {
    setSelectedWebinar(webinar);
    setIsAttendeesModalOpen(true);
  };

  const columns = useMemo<ColumnDef<WebinarAnalytics>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Webinar Title',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'totalRegistrations',
      header: () => <div className="text-center">Total Registrations</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-primary-600">
          {(info.getValue() as number).toLocaleString()}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'registrationRate',
      header: () => <div className="text-center">Registration Rate</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {(info.getValue() as number).toFixed(1)}%
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'actualAttendance',
      header: () => <div className="text-center">Actual Attendance</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-green-600">
          {(info.getValue() as number).toLocaleString()}
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'attendanceRate',
      header: () => <div className="text-center">Attendance Rate</div>,
      cell: (info) => (
        <div className="text-center font-semibold text-blue-600">
          {(info.getValue() as number).toFixed(1)}%
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <button
            onClick={() => handleViewAttendees(row.original)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
            View Attendees
          </button>
        </div>
      ),
      meta: { className: 'text-center' },
    },
  ], []);

  const attendeeColumns = useMemo<ColumnDef<WebinarAttendee>[]>(() => [
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
      accessorKey: 'attendedAt',
      header: () => <div className="text-center">Attended At</div>,
      cell: (info) => (
        <div className="text-center text-sm text-gray-600">
          {format(new Date(info.getValue() as string), 'MMM d, yyyy HH:mm')}
        </div>
      ),
      meta: { className: 'text-center' },
    },
  ], []);

  return (
    <>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Webinar Analytics</h2>
        <DataTable
          data={mockWebinarAnalytics}
          columns={columns}
          enableSearch={true}
          searchPlaceholder="Search webinars..."
          emptyMessage="No webinar analytics data found."
        />
      </Card>

      {/* Attendees Modal */}
      <Modal
        isOpen={isAttendeesModalOpen}
        onClose={() => setIsAttendeesModalOpen(false)}
        title={`Webinar Attendees: ${selectedWebinar?.title || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Registrations</p>
              <p className="text-2xl font-bold text-blue-600">
                {selectedWebinar?.totalRegistrations}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Actual Attendance</p>
              <p className="text-2xl font-bold text-green-600">
                {selectedWebinar?.actualAttendance}
              </p>
            </div>
          </div>
          {selectedWebinar && (
            <DataTable
              data={selectedWebinar.attendees}
              columns={attendeeColumns}
              enableSearch={false}
              emptyMessage="No attendees found."
            />
          )}
        </div>
      </Modal>
    </>
  );
}

export default WebinarAnalyticsTable;
