/**
 * One row per (allocation, session_date) occurrence — student and teacher
 * attendance shown side by side. A row only exists here if at least one
 * side clicked "Join" for it; this is not a full record of every
 * scheduled session, only of recorded attendance events.
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
}
