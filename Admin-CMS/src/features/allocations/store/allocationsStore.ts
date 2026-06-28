import { create } from 'zustand';
import { get, post } from '@/services/api/client';

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

interface AllocationsState {
  allocations: Allocation[];
  isLoading: boolean;
  error: string | null;
  fetchAllocations: () => Promise<void>;
  createAllocation: (data: AllocationCreate) => Promise<void>;
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
  }
}));
