export interface SessionScore {
  id: string;
  student_id: string;
  teacher_id: string;
  date: string;
  score: number;
}

export interface TeacherHistory {
  id: string;
  student_id: string;
  teacher_id: string;
  assigned_at: string;
  ended_at?: string;
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

export interface Allocation {
  id: string;
  teacher_id: string;
  student_id: string;
  sessions_per_week: number;
  duration: number;
  schedule: any[];
  created_at: string;
}
