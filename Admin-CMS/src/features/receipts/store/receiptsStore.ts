/**
 * Zustand store for payment receipts — backed by the /receipts API.
 */
import { create } from 'zustand';
import { get } from '@/services/api/client';

export interface Receipt {
  id: string;
  studentId: string;
  studentName: string;
  originalFilename: string;
  contentType: string;
  amount?: string;
  note?: string;
  createdAt: string;
  expiresAt: string;
}

const LAST_SEEN_KEY = 'qv_receipts_last_seen';

interface ReceiptsState {
  receipts: Receipt[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchReceipts: () => Promise<void>;
  fetchReceiptBlob: (id: string) => Promise<Blob>;
  markAllRead: () => void;
}

const mapReceipt = (item: any): Receipt => ({
  id: item.id,
  studentId: item.student_id,
  studentName: item.student_name,
  originalFilename: item.original_filename,
  contentType: item.content_type,
  amount: item.amount ?? undefined,
  note: item.note ?? undefined,
  createdAt: item.created_at,
  expiresAt: item.expires_at,
});

const countNew = (list: Receipt[]): number => {
  const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
  if (!lastSeen) return list.length; // never visited → everything is new
  const threshold = new Date(lastSeen).getTime();
  return list.filter((r) => new Date(r.createdAt).getTime() > threshold).length;
};

export const useReceiptsStore = create<ReceiptsState>((set) => ({
  receipts: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchReceipts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<any[]>('/receipts');
      const receipts = response.map(mapReceipt);
      set({ receipts, unreadCount: countNew(receipts), isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to fetch receipts',
        isLoading: false,
      });
    }
  },

  fetchReceiptBlob: async (id: string) => {
    return get<Blob>(`/receipts/${id}/file`, { responseType: 'blob' });
  },

  markAllRead: () => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    set({ unreadCount: 0 });
  },
}));
