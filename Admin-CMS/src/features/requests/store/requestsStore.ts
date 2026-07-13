/**
 * Zustand store for platform requests — backed by the /requests API.
 */
import { create } from 'zustand';
import { get, patch } from '@/services/api/client';
import {
  type PlatformRequest,
  type RequestStatus,
} from '@/mock-data/complaints-requests';

interface RequestsState {
  requests: PlatformRequest[];
  unreadCount: number; // pending requests not yet actioned
  isLoading: boolean;
  error: string | null;
  fetchRequests: () => Promise<void>;
  updateStatus: (id: string, status: RequestStatus, adminNote?: string) => Promise<void>;
}

const countUnread = (list: PlatformRequest[]) =>
  list.filter((r) => r.status === 'pending').length;

// Map the backend snake_case shape onto the UI's PlatformRequest.
const mapRequest = (item: any): PlatformRequest => ({
  id: item.id,
  type: item.type,
  fromName: item.from_name,
  fromRole: item.from_role,
  details: item.details,
  currentDay: item.current_day ?? undefined,
  currentTime: item.current_time ?? undefined,
  requestedDay: item.requested_day ?? undefined,
  requestedTime: item.requested_time ?? undefined,
  requestedPlan: item.requested_plan ?? undefined,
  requestedTeacher: item.requested_teacher ?? undefined,
  date: item.created_at,
  status: item.status as RequestStatus,
  adminNote: item.admin_note ?? undefined,
});

export const useRequestsStore = create<RequestsState>((set) => ({
  requests: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<any[]>('/requests');
      const requests = response.map(mapRequest);
      set({ requests, unreadCount: countUnread(requests), isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch requests', isLoading: false });
    }
  },

  updateStatus: async (id, status, adminNote) => {
    try {
      await patch(`/requests/${id}/status`, { status, admin_note: adminNote });

      set((state) => {
        const updated = state.requests.map((r) =>
          r.id === id ? { ...r, status, ...(adminNote ? { adminNote } : {}) } : r
        );
        return { requests: updated, unreadCount: countUnread(updated) };
      });
    } catch (error: any) {
      console.error('Failed to update request status', error);
      throw error;
    }
  },
}));
