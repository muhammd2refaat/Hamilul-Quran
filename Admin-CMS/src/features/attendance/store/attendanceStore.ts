/**
 * Zustand store for the attendance log — backed by GET /sessions/attendance.
 */
import { create } from 'zustand';
import { get as apiGet } from '@/services/api/client';
import type { AttendanceRecord } from '../types';

interface AttendanceState {
  records: AttendanceRecord[];
  isLoading: boolean;
  error: string | null;
  fetchAttendance: () => Promise<void>;
}

// Map the backend snake_case shape onto the UI's camelCase AttendanceRecord.
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
});

export const useAttendanceStore = create<AttendanceState>((set) => ({
  records: [],
  isLoading: false,
  error: null,

  fetchAttendance: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGet<any[]>('/sessions/attendance');
      set({ records: response.map(mapRecord), isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch attendance', isLoading: false });
    }
  },
}));
