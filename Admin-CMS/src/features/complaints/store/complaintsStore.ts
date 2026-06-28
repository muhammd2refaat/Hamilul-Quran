import { create } from 'zustand';
import { get, patch } from '@/services/api/client';
import { type PlatformComplaint, type ComplaintStatus } from '@/mock-data/complaints-requests';

interface ComplaintsState {
  complaints: PlatformComplaint[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchComplaints: () => Promise<void>;
  updateStatus: (id: string, status: ComplaintStatus, adminNote?: string) => Promise<void>;
}

const countUnread = (list: PlatformComplaint[]) =>
  list.filter((c) => c.status === 'open').length;

export const useComplaintsStore = create<ComplaintsState>((set) => ({
  complaints: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchComplaints: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<any[]>('/complaints');
      
      // Map backend shape to PlatformComplaint
      const complaints: PlatformComplaint[] = response.map((item) => ({
        id: item.id,
        from: item.complaint_from as any,
        filedByName: item.filed_by_name,
        aboutName: item.about_name,
        category: item.category as any,
        description: item.description,
        status: item.status as ComplaintStatus,
        date: item.created_at,
        adminNote: item.admin_note,
      }));

      set({ complaints, unreadCount: countUnread(complaints), isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch complaints', isLoading: false });
    }
  },

  updateStatus: async (id, status, adminNote) => {
    try {
      await patch(`/complaints/${id}/status`, { status, admin_note: adminNote });
      
      set((state) => {
        const updated = state.complaints.map((c) =>
          c.id === id ? { ...c, status, ...(adminNote ? { adminNote } : {}) } : c
        );
        return { complaints: updated, unreadCount: countUnread(updated) };
      });
    } catch (error: any) {
      console.error('Failed to update complaint status', error);
      throw error;
    }
  },
}));
