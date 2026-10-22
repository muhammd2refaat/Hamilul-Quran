/**
 * Zustand store for the attendance log — backed by GET /sessions/attendance.
 */
import { create } from 'zustand';
import { get as apiGet, patch as apiPatch } from '@/services/api/client';
import type { AttendanceRecord } from '../types';

interface AttendanceState {
  records: AttendanceRecord[];
  isLoading: boolean;
  error: string | null;
  fetchAttendance: () => Promise<void>;
  excuse: (outcomeId: string, note: string) => Promise<void>;
}

// Map the backend snake_case shape onto the UI's camelCase AttendanceRecord.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRecord = (item: any): AttendanceRecord => ({
  allocationId: item.allocation_id,
  sessionDate: item.session_date,
  scheduledDay: item.scheduled_day,
  scheduledTime: item.scheduled_time,
  studentId: item.student_id,
  studentName: item.student_name,
  studentJoinedAt: item.student_joined_at ?? null,
  teacherId: item.teacher_id,
  teacherName: item.teacher_name,
  teacherJoinedAt: item.teacher_joined_at ?? null,
  status: item.status ?? 'pending',
  outcomeId: item.outcome_id ?? null,
  sessionCharge: item.session_charge ?? 0,
  note: item.note ?? null,
});

export const useAttendanceStore = create<AttendanceState>((set) => ({
  records: [],
  isLoading: false,
  error: null,

  fetchAttendance: async () => {
    set({ isLoading: true, error: null });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await apiGet<any[]>('/sessions/attendance');
      set({ records: response.map(mapRecord), isLoading: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch attendance', isLoading: false });
    }
  },

  excuse: async (outcomeId, note) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = mapRecord(await apiPatch<any>(`/sessions/attendance/outcomes/${outcomeId}/excuse`, { note }));
    set((state) => ({
      records: state.records.map((r) => (r.outcomeId === outcomeId ? updated : r)),
    }));
  },
}));
