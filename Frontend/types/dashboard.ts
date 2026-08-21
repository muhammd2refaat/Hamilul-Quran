export interface SessionScore {
  id: string;
  student_id: string;
  teacher_id: string;
  date: string;
  score: number;
  max_score: number;
  surah?: string;
  teacher_comment?: string;
  notes?: string;
  recitation_type?: string;
}

export interface AttendanceSummaryItem {
  allocation_id: string;
  counterpart_id: string;
  counterpart_name: string;
  session_count: number;
}

export interface AttendanceSummary {
  total_sessions: number;
  by_counterpart: AttendanceSummaryItem[];
}

export interface AdminAttendanceItem {
  allocation_id: string;
  session_date: string;
  scheduled_day: string;
  scheduled_time: string;
  student_id: string;
  student_name: string;
  student_joined_at?: string | null;
  teacher_id: string;
  teacher_name: string;
  teacher_joined_at?: string | null;
}

export interface TeacherHistory {
  id: string;
  student_id: string;
  teacher_id: string;
  assigned_at: string;
  unassigned_at?: string;
  reason?: string;
}

export interface Complaint {
  id: string;
  user_id: string;
  about_id?: string;
  complaint_from: 'STUDENT' | 'TEACHER' | 'ADMIN';
  category: 'TECHNICAL' | 'BEHAVIORAL' | 'OTHER';
  subject: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  created_at: string;
}

export interface ScheduleSlot {
  day: string;
  time: string;
  // Populated once the backend's Google Calendar sync succeeds for this slot
  // (AllocationService._try_create_calendar_events) — absent/null until then.
  meet_link?: string | null;
}

export interface Allocation {
  id: string;
  teacher_id: string;
  student_id: string;
  sessions_per_week: number;
  duration: number;
  schedule: ScheduleSlot[];
  created_at: string;
}

export interface TeacherStats {
  student_count: number;
  sessions_per_week_total: number;
  avg_score_pct: number | null;
  sessions_attended_total: number;
}

export interface TeacherStudent {
  allocation_id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  sessions_per_week: number;
  duration: number;
  schedule: ScheduleSlot[];
  last_score?: number;
  last_max_score?: number;
  last_session_date?: string;
}

export type RequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
export type RequestType = 'reschedule' | 'new_enrollment' | 'change_teacher' | 'pause' | 'other';

export interface PlatformRequest {
  id: string;
  user_id: string;
  from_role: 'student' | 'teacher' | 'guardian';
  type: RequestType;
  details: string;
  current_day?: string;
  current_time?: string;
  requested_day?: string;
  requested_time?: string;
  requested_plan?: string;
  requested_teacher?: string;
  // Structured PlanRequestModal picks — present for plan requests filed
  // since this was added; older requests may have these as null/undefined
  // even for the same request type.
  requested_sessions_per_week?: number | null;
  requested_duration?: number | null;
  requested_schedule?: ScheduleSlot[] | null;
  admin_note?: string;
  status: RequestStatus;
  created_at: string;
  resolved_at?: string;
}

export interface CalendarEvent {
  id: string;
  allocation_id: string;
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

export interface TeacherOption {
  user_id: string;
  full_name: string;
}

export type SubscriptionStatus = 'active' | 'paused' | 'withdrawn';

export interface Subscription {
  id: string;
  student_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  start_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  student_id: string;
  original_filename: string;
  content_type: string;
  amount?: string | null;
  note?: string | null;
  created_at: string;
  expires_at: string;
}
