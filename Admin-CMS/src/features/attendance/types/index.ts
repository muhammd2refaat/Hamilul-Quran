/** How a lesson went, decided by the backend once it has ended. "pending"
 * means it hasn't been finalized yet (in progress, or just finished).
 * "confirmed" = an admin confirmed it took place outside the platform;
 * "not_scheduled" = after the student's last paid lesson, nobody joined. */
export type AttendanceStatus =
  | 'both' | 'confirmed' | 'teacher_only' | 'student_only' | 'missed' | 'excused' | 'not_scheduled' | 'pending';

/** Lessons an admin can confirm as done. */
export const CONFIRMABLE: AttendanceStatus[] = ['missed', 'teacher_only', 'student_only', 'not_scheduled'];

/** Monthly history (GET /sessions/attendance/history). */
export interface HistoryCounts {
  id: string;
  name: string;
  scheduled: number;
  done: number;
  student_no_show: number;
  teacher_no_show: number;
  missed: number;
  excused: number;
  upcoming: number;
  not_scheduled: number;
}

export interface TeacherHistory extends HistoryCounts {
  /** done + student no-shows — what the teacher is credited for. */
  credited: number;
}

export interface StudentHistory extends HistoryCounts {
  plan_name: string | null;
  sessions_per_week: number | null;
  sessions_remaining: number | null;
  ends_on: string | null;
}

export interface HistoryLesson {
  session_date: string;
  scheduled_time: string;
  teacher_id: string | null;
  teacher_name: string;
  student_id: string | null;
  student_name: string;
  status: AttendanceStatus | 'upcoming';
  outcome_id: string | null;
  note: string | null;
}

export interface MonthlyHistory {
  month: string;
  teachers: TeacherHistory[];
  students: StudentHistory[];
  lessons: HistoryLesson[];
}

/**
 * One row per scheduled lesson occurrence — student and teacher attendance
 * side by side, plus its outcome. Lessons nobody joined appear too (status
 * "missed"), so absences are visible rather than silently missing.
 */
export interface AttendanceRecord {
  allocationId: string;
  sessionDate: string; // "YYYY-MM-DD"
  scheduledDay: string;
  scheduledTime: string;
  studentId: string;
  studentName: string;
  studentJoinedAt: string | null;
  teacherId: string;
  teacherName: string;
  teacherJoinedAt: string | null;
  status: AttendanceStatus;
  outcomeId: string | null;
  /** +1 session deducted (student no-show), -1 refunded (teacher no-show), 0 none. */
  sessionCharge: number;
  note: string | null;
}
