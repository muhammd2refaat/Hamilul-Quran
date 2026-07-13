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

interface ReceiptsState {
  receipts: Receipt[];
  isLoading: boolean;
  error: string | null;
  fetchReceipts: () => Promise<void>;
  fetchReceiptBlob: (id: string) => Promise<Blob>;
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

export const useReceiptsStore = create<ReceiptsState>((set) => ({
  receipts: [],
  isLoading: false,
  error: null,

  fetchReceipts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<any[]>('/receipts');
      set({ receipts: response.map(mapReceipt), isLoading: false });
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
}));
