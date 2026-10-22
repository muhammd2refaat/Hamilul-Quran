/** How a lesson went, decided by the backend once it has ended. "pending"
 * means it hasn't been finalized yet (in progress, or just finished). */
export type AttendanceStatus = 'both' | 'teacher_only' | 'student_only' | 'missed' | 'excused' | 'pending';

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
