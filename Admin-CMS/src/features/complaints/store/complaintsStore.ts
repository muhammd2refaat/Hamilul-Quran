/**
 * Zustand store for platform complaints
 */
import { create } from 'zustand';
import {
  mockComplaints,
  type PlatformComplaint,
  type ComplaintStatus,
} from '@/mock-data/complaints-requests';

interface ComplaintsState {
  complaints: PlatformComplaint[];
  unreadCount: number; // open complaints not yet actioned by admin
  updateStatus: (id: string, status: ComplaintStatus, adminNote?: string) => void;
}

const countUnread = (list: PlatformComplaint[]) =>
  list.filter((c) => c.status === 'open').length;

export const useComplaintsStore = create<ComplaintsState>((set) => ({
  complaints: mockComplaints,
  unreadCount: countUnread(mockComplaints),

  updateStatus: (id, status, adminNote) =>
    set((state) => {
      const updated = state.complaints.map((c) =>
        c.id === id ? { ...c, status, ...(adminNote ? { adminNote } : {}) } : c
      );
      return { complaints: updated, unreadCount: countUnread(updated) };
    }),
}));
