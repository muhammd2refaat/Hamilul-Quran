/**
 * Mock data for Complaints and Requests modules
 */

// ─── Complaints ───────────────────────────────────────────────────────────────

export type ComplaintFrom = 'student' | 'teacher';
export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';
export type ComplaintCategory =
  | 'late_session'
  | 'no_feedback'
  | 'curriculum'
  | 'behaviour'
  | 'technical'
  | 'other';

export interface PlatformComplaint {
  id: string;
  from: ComplaintFrom;
  filedByName: string;  // name of person who filed
  aboutName: string;    // name of person/entity the complaint is about
  category: ComplaintCategory;
  description: string;
  date: string;
  status: ComplaintStatus;
  adminNote?: string;   // admin response / note
}

export const mockComplaints: PlatformComplaint[] = [
  // ── From Students ──
  {
    id: 'pc-1',
    from: 'student',
    filedByName: 'Mohammed Al-Saud',
    aboutName: 'Sheikh Ahmed Al-Qari',
    category: 'late_session',
    description: 'Teacher was late to three sessions in a row without prior notice.',
    date: '2025-03-05',
    status: 'resolved',
    adminNote: 'Teacher was counselled. Punctuality commitment obtained.',
  },
  {
    id: 'pc-2',
    from: 'student',
    filedByName: 'Omar Ibrahim',
    aboutName: 'Ustadha Maryam Al-Hafiz',
    category: 'curriculum',
    description: 'Sessions were not structured and lacked proper curriculum.',
    date: '2025-01-10',
    status: 'open',
  },
  {
    id: 'pc-3',
    from: 'student',
    filedByName: 'Omar Ibrahim',
    aboutName: 'Ustadha Maryam Al-Hafiz',
    category: 'no_feedback',
    description: 'No feedback given after recitation practice.',
    date: '2025-01-18',
    status: 'in_review',
    adminNote: 'Requested teacher to submit written feedback logs.',
  },
  {
    id: 'pc-4',
    from: 'student',
    filedByName: 'Khalid Al-Qahtani',
    aboutName: 'Ustadha Maryam Al-Hafiz',
    category: 'behaviour',
    description: 'Scheduling conflicts were not handled professionally.',
    date: '2025-02-14',
    status: 'resolved',
    adminNote: 'Schedule was reorganised. Both parties satisfied.',
  },
  {
    id: 'pc-5',
    from: 'student',
    filedByName: 'Hassan Al-Shehri',
    aboutName: 'Sheikh Ahmed Al-Qari',
    category: 'no_feedback',
    description: 'Recitation corrections were not detailed enough.',
    date: '2025-06-01',
    status: 'open',
  },
  // ── From Teachers ──
  {
    id: 'pc-6',
    from: 'teacher',
    filedByName: 'Ustadha Maryam Al-Hafiz',
    aboutName: 'Omar Ibrahim',
    category: 'behaviour',
    description: 'Student repeatedly joins sessions unprepared and has not revised the assigned surah for three consecutive weeks.',
    date: '2025-02-01',
    status: 'resolved',
    adminNote: 'Spoke with student. Improvement plan agreed.',
  },
  {
    id: 'pc-7',
    from: 'teacher',
    filedByName: 'Sheikh Ahmed Al-Qari',
    aboutName: 'Hassan Al-Shehri',
    category: 'behaviour',
    description: 'Student often disconnects mid-session without explanation and has missed two scheduled evaluations.',
    date: '2025-05-28',
    status: 'in_review',
    adminNote: 'Attempting to contact student\'s guardian.',
  },
  {
    id: 'pc-8',
    from: 'teacher',
    filedByName: 'Sheikh Khalid Al-Tajweed',
    aboutName: 'Platform Admin',
    category: 'technical',
    description: 'The scheduling system does not allow session rescheduling within 24 hours notice — this needs to be fixed urgently.',
    date: '2025-06-10',
    status: 'open',
  },
  {
    id: 'pc-9',
    from: 'teacher',
    filedByName: 'Ustadha Maryam Al-Hafiz',
    aboutName: 'Platform Admin',
    category: 'other',
    description: 'Monthly teacher reports are not being shared with the teachers themselves. Transparency needs improvement.',
    date: '2025-06-12',
    status: 'dismissed',
    adminNote: 'Reports are confidential admin documents by policy.',
  },
];

// ─── Requests ────────────────────────────────────────────────────────────────

export type RequestType = 'reschedule' | 'new_enrollment' | 'change_teacher' | 'pause' | 'other';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'in_review';

export interface PlatformRequest {
  id: string;
  type: RequestType;
  fromName: string;
  fromRole: 'student' | 'teacher' | 'guardian';
  details: string;
  // Reschedule-specific
  currentDay?: string;
  currentTime?: string;
  requestedDay?: string;
  requestedTime?: string;
  // Enrollment-specific
  requestedPlan?: string;
  requestedTeacher?: string;
  date: string;
  status: RequestStatus;
  adminNote?: string;
}

export const mockRequests: PlatformRequest[] = [
  // ── Reschedule requests ──
  {
    id: 'req-1',
    type: 'reschedule',
    fromName: 'Fatima Al-Rashid',
    fromRole: 'student',
    details: 'My work schedule changed. I can no longer attend Tuesday sessions.',
    currentDay: 'Tuesday',
    currentTime: '10:00 AM',
    requestedDay: 'Thursday',
    requestedTime: '04:00 PM',
    date: '2025-06-10',
    status: 'pending',
  },
  {
    id: 'req-2',
    type: 'reschedule',
    fromName: 'Aisha Hassan',
    fromRole: 'student',
    details: 'University exam season — need to temporarily shift Friday session.',
    currentDay: 'Friday',
    currentTime: '02:00 PM',
    requestedDay: 'Saturday',
    requestedTime: '08:00 PM',
    date: '2025-06-11',
    status: 'approved',
    adminNote: 'Teacher confirmed the new slot. Updated in system.',
  },
  {
    id: 'req-3',
    type: 'reschedule',
    fromName: 'Yousef Al-Nasser',
    fromRole: 'student',
    details: 'Requesting earlier time slot on Wednesdays — current slot clashes with prayer.',
    currentDay: 'Wednesday',
    currentTime: '06:00 PM',
    requestedDay: 'Wednesday',
    requestedTime: '10:00 AM',
    date: '2025-06-14',
    status: 'in_review',
  },
  // ── New enrollment requests ──
  {
    id: 'req-4',
    type: 'new_enrollment',
    fromName: 'Abdullah Al-Hamdan',
    fromRole: 'student',
    details: 'I am a new student seeking to join the Beginner Tajweed plan. I have basic Quran reading skills.',
    requestedPlan: 'Beginner Tajweed',
    requestedTeacher: 'Sheikh Ahmed Al-Qari',
    date: '2025-06-13',
    status: 'pending',
  },
  {
    id: 'req-5',
    type: 'new_enrollment',
    fromName: 'Hana Karimi',
    fromRole: 'guardian',
    details: 'Requesting enrollment for my 12-year-old daughter in the children\'s Quran memorisation plan.',
    requestedPlan: 'Quran Memorisation – Kids',
    requestedTeacher: 'Ustadha Maryam Al-Hafiz',
    date: '2025-06-15',
    status: 'pending',
  },
  {
    id: 'req-6',
    type: 'new_enrollment',
    fromName: 'Tariq Al-Balushi',
    fromRole: 'student',
    details: 'Completed foundational level at another institute. Looking to join Advanced Qira\'at directly.',
    requestedPlan: "Advanced Qira'at",
    requestedTeacher: 'Sheikh Khalid Al-Tajweed',
    date: '2025-06-12',
    status: 'approved',
    adminNote: 'Placement test passed. Enrolled in advanced track.',
  },
  // ── Change teacher requests ──
  {
    id: 'req-7',
    type: 'change_teacher',
    fromName: 'Sara Mahmoud',
    fromRole: 'student',
    details: 'I feel I would progress faster with a different teaching style. Requesting transfer to Ustadha Maryam.',
    requestedTeacher: 'Ustadha Maryam Al-Hafiz',
    date: '2025-06-16',
    status: 'pending',
  },
  {
    id: 'req-8',
    type: 'change_teacher',
    fromName: 'Nora Al-Ghamdi',
    fromRole: 'student',
    details: 'Completed basic level successfully and requesting upgrade to Sheikh Khalid\'s advanced programme.',
    requestedTeacher: 'Sheikh Khalid Al-Tajweed',
    date: '2025-05-25',
    status: 'approved',
    adminNote: 'Level assessment completed. Transfer approved.',
  },
  // ── Pause requests ──
  {
    id: 'req-9',
    type: 'pause',
    fromName: 'Khalid Al-Qahtani',
    fromRole: 'student',
    details: 'Travelling abroad for 6 weeks. Requesting to pause subscription without losing progress.',
    date: '2025-06-05',
    status: 'approved',
    adminNote: 'Subscription paused until July 18, 2025.',
  },
  {
    id: 'req-10',
    type: 'pause',
    fromName: 'Layla Al-Khalifa',
    fromRole: 'student',
    details: 'Family health emergency. Need to pause for 2–3 weeks.',
    date: '2025-06-17',
    status: 'pending',
  },
];
