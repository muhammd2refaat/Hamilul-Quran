/**
 * Zustand store for platform requests
 */
import { create } from 'zustand';
import {
  mockRequests,
  type PlatformRequest,
  type RequestStatus,
} from '@/mock-data/complaints-requests';

interface RequestsState {
  requests: PlatformRequest[];
  unreadCount: number; // pending requests not yet actioned
  updateStatus: (id: string, status: RequestStatus, adminNote?: string) => void;
}

const countUnread = (list: PlatformRequest[]) =>
  list.filter((r) => r.status === 'pending').length;

export const useRequestsStore = create<RequestsState>((set) => ({
  requests: mockRequests,
  unreadCount: countUnread(mockRequests),

  updateStatus: (id, status, adminNote) =>
    set((state) => {
      const updated = state.requests.map((r) =>
        r.id === id ? { ...r, status, ...(adminNote ? { adminNote } : {}) } : r
      );
      return { requests: updated, unreadCount: countUnread(updated) };
    }),
}));
