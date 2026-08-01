import { create } from 'zustand';
import { get } from '@/services/api/client';

export interface CalendarEvent {
  id: string;
  date: string; // ISO date, e.g. "2026-07-16"
  day: string;
  time: string;
  duration: number;
  teacher_id: string;
  teacher_name: string;
  student_id: string;
  student_name: string;
  meet_link?: string | null;
}

interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  fetchEvents: (weeks?: number) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  isLoading: false,
  error: null,

  fetchEvents: async (weeks = 4) => {
    set({ isLoading: true, error: null });
    try {
      const response = await get<CalendarEvent[]>(`/calendar?weeks=${weeks}`);
      set({ events: response, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch calendar events',
        isLoading: false,
      });
    }
  },
}));
