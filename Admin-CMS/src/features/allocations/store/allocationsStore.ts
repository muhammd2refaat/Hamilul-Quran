import { create } from 'zustand';
import { get, post, patch, del } from '@/services/api/client';

export interface AllocationSchedule {
  day: string;
  time: string;
}

export interface Allocation {
  id: string;
  teacher_id: string;
  student_id: string;
  sessions_per_week: number;
  duration: number;
  schedule: AllocationSchedule[];
  created_at: string;
}

export interface AllocationCreate {
  teacher_id: string;
  student_id: string;
  sessions_per_week: number;
  duration: number;
  schedule: AllocationSchedule[];
}

export interface AllocationUpdate {
  teacher_id?: string;
  student_id?: string;
  sessions_per_week?: number;
  duration?: number;
  schedule?: AllocationSchedule[];
}

interface AllocationsState {
  allocations: Allocation[];
  isLoading: boolean;
  error: string | null;
  fetchAllocations: () => Promise<void>;
  createAllocation: (data: AllocationCreate) => Promise<void>;
  updateAllocation: (id: string, data: AllocationUpdate) => Promise<void>;
  deleteAllocation: (id: string) => Promise<void>;
}

export const useAllocationsStore = create<AllocationsState>((set) => ({
  allocations: [],
  isLoading: false,
  error: null,

  fetchAllocations: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<Allocation[]>('/allocations');
      set({ allocations: response, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch allocations', 
        isLoading: false 
      });
    }
  },

  createAllocation: async (data: AllocationCreate) => {
    set({ isLoading: true, error: null });
    try {
      const response = await post<Allocation>('/allocations', data);
      set((state) => ({ 
        allocations: [response, ...state.allocations],
        isLoading: false 
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create allocation',
        isLoading: false
      });
      throw error;
    }
  },

  updateAllocation: async (id: string, data: AllocationUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const response = await patch<Allocation>(`/allocations/${id}`, data);
      set((state) => ({
        allocations: state.allocations.map((a) => (a.id === id ? response : a)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update allocation',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteAllocation: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await del(`/allocations/${id}`);
      set((state) => ({
        allocations: state.allocations.filter((a) => a.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete allocation',
        isLoading: false,
      });
      throw error;
    }
  },
}));
