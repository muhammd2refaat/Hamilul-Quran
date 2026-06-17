/**
 * Mock data for subscriptions module
 */

export type SubscriptionStatus = 'active' | 'withdrawn' | 'paused';

export interface Complaint {
  id: string;
  date: string;
  description: string;
  resolved: boolean;
}

export interface TeacherHistoryEntry {
  teacherName: string;
  from: string;
  to: string;
  reason: string;
}

export interface SessionScore {
  id: string;
  date: string;
  teacherName: string; // which teacher gave this score
  score: number;       // e.g. 17
  maxScore: number;    // e.g. 20
  surah: string;       // what was recited
  teacherComment?: string; // optional comment from teacher
}

export interface StudentSubscription {
  id: string;
  studentName: string;
  phone: string;
  age: number;
  joinDate: string;
  teacherName: string;   // current teacher
  teacherAge: number;
  status: SubscriptionStatus;
  complaints: Complaint[];
  teacherHistory: TeacherHistoryEntry[];
  sessions: SessionScore[];
}

export interface TeacherReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
  isAdmin: boolean;
}

export interface UpcomingSession {
  id: string;
  date: string;
  time: string;
  studentName: string;
}

export interface TeacherSubscription {
  id: string;
  teacherName: string;
  age: number;
  qualifications: string[];
  studentCount: number;
  sessionCount: number;
  reviews: TeacherReview[];
  upcomingSessions: UpcomingSession[];
}

// ─── Student Subscriptions ────────────────────────────────────────────────────

export const mockStudentSubscriptions: StudentSubscription[] = [
  {
    id: 'sub-1',
    studentName: 'Fatima Al-Rashid',
    phone: '+966501234567',
    age: 22,
    joinDate: '2025-01-15',
    teacherName: 'Sheikh Ahmed Al-Qari',
    teacherAge: 45,
    status: 'active',
    complaints: [],
    teacherHistory: [],
    sessions: [
      { id: 's1-1', date: '2025-01-20', teacherName: 'Sheikh Ahmed Al-Qari', score: 18, maxScore: 20, surah: 'Al-Fatiha', teacherComment: 'Excellent Makharij, keep focusing on Madd rules.' },
      { id: 's1-2', date: '2025-02-03', teacherName: 'Sheikh Ahmed Al-Qari', score: 17, maxScore: 20, surah: 'Al-Baqarah (1-10)' },
      { id: 's1-3', date: '2025-02-17', teacherName: 'Sheikh Ahmed Al-Qari', score: 19, maxScore: 20, surah: 'Al-Baqarah (11-20)', teacherComment: 'Remarkable progress this session, Masha\'Allah.' },
      { id: 's1-4', date: '2025-03-03', teacherName: 'Sheikh Ahmed Al-Qari', score: 16, maxScore: 20, surah: 'Al-Baqarah (21-30)' },
      { id: 's1-5', date: '2025-03-17', teacherName: 'Sheikh Ahmed Al-Qari', score: 18, maxScore: 20, surah: 'Al-Baqarah (31-40)', teacherComment: 'Good improvement on Ghunnah. Review Qalqalah at home.' },
    ],
  },
  {
    id: 'sub-2',
    studentName: 'Mohammed Al-Saud',
    phone: '+966502345678',
    age: 28,
    joinDate: '2025-02-10',
    teacherName: 'Sheikh Ahmed Al-Qari',
    teacherAge: 45,
    status: 'active',
    complaints: [
      {
        id: 'cmp-1',
        date: '2025-03-05',
        description: 'Teacher was late to three sessions in a row without prior notice.',
        resolved: true,
      },
    ],
    teacherHistory: [
      {
        teacherName: 'Ustadha Maryam Al-Hafiz',
        from: '2024-06-01',
        to: '2025-01-30',
        reason: 'Requested a teacher with Hafs recitation specialisation.',
      },
    ],
    sessions: [
      { id: 's2-1', date: '2024-06-15', teacherName: 'Ustadha Maryam Al-Hafiz', score: 14, maxScore: 20, surah: 'Al-Fatiha', teacherComment: 'Needs improvement on elongation rules.' },
      { id: 's2-2', date: '2024-07-01', teacherName: 'Ustadha Maryam Al-Hafiz', score: 15, maxScore: 20, surah: 'An-Nas' },
      { id: 's2-3', date: '2025-02-15', teacherName: 'Sheikh Ahmed Al-Qari', score: 16, maxScore: 20, surah: 'Al-Fatiha', teacherComment: 'Good start. Focus on stopping rules (Waqf).' },
      { id: 's2-4', date: '2025-03-01', teacherName: 'Sheikh Ahmed Al-Qari', score: 17, maxScore: 20, surah: 'Al-Ikhlas' },
      { id: 's2-5', date: '2025-04-05', teacherName: 'Sheikh Ahmed Al-Qari', score: 18, maxScore: 20, surah: 'Al-Falaq', teacherComment: 'Consistent improvement, well done.' },
    ],
  },
  {
    id: 'sub-3',
    studentName: 'Aisha Hassan',
    phone: '+966503456789',
    age: 19,
    joinDate: '2025-03-01',
    teacherName: 'Ustadha Maryam Al-Hafiz',
    teacherAge: 38,
    status: 'paused',
    complaints: [],
    teacherHistory: [],
    sessions: [
      { id: 's3-1', date: '2025-03-08', teacherName: 'Ustadha Maryam Al-Hafiz', score: 15, maxScore: 20, surah: 'Al-Fatiha' },
      { id: 's3-2', date: '2025-03-22', teacherName: 'Ustadha Maryam Al-Hafiz', score: 16, maxScore: 20, surah: 'Al-Kawthar', teacherComment: 'Good rhythm. Work on breath control during long verses.' },
      { id: 's3-3', date: '2025-04-05', teacherName: 'Ustadha Maryam Al-Hafiz', score: 14, maxScore: 20, surah: 'Al-Maun' },
    ],
  },
  {
    id: 'sub-4',
    studentName: 'Omar Ibrahim',
    phone: '+966504567890',
    age: 35,
    joinDate: '2024-11-20',
    teacherName: 'Ustadha Maryam Al-Hafiz',
    teacherAge: 38,
    status: 'withdrawn',
    complaints: [
      {
        id: 'cmp-2',
        date: '2025-01-10',
        description: 'Sessions were not structured and lacked proper curriculum.',
        resolved: false,
      },
      {
        id: 'cmp-3',
        date: '2025-01-18',
        description: 'No feedback given after recitation practice.',
        resolved: false,
      },
    ],
    teacherHistory: [
      {
        teacherName: 'Sheikh Khalid Al-Tajweed',
        from: '2024-01-01',
        to: '2024-11-15',
        reason: 'Schedule mismatch with advanced sessions.',
      },
    ],
    sessions: [
      { id: 's4-1', date: '2024-01-10', teacherName: 'Sheikh Khalid Al-Tajweed', score: 12, maxScore: 20, surah: 'Al-Fatiha', teacherComment: 'Needs significant work on Tajweed rules from basics.' },
      { id: 's4-2', date: '2024-02-01', teacherName: 'Sheikh Khalid Al-Tajweed', score: 13, maxScore: 20, surah: 'Al-Asr' },
      { id: 's4-3', date: '2024-11-25', teacherName: 'Ustadha Maryam Al-Hafiz', score: 11, maxScore: 20, surah: 'Al-Fatiha', teacherComment: 'Struggled with Makhraj of certain letters. Requires extra practice.' },
      { id: 's4-4', date: '2024-12-10', teacherName: 'Ustadha Maryam Al-Hafiz', score: 12, maxScore: 20, surah: 'Al-Nas' },
    ],
  },
  {
    id: 'sub-5',
    studentName: 'Layla Al-Khalifa',
    phone: '+971501234567',
    age: 24,
    joinDate: '2025-04-12',
    teacherName: 'Sheikh Khalid Al-Tajweed',
    teacherAge: 52,
    status: 'active',
    complaints: [],
    teacherHistory: [],
    sessions: [
      { id: 's5-1', date: '2025-04-18', teacherName: 'Sheikh Khalid Al-Tajweed', score: 19, maxScore: 20, surah: 'Al-Fatiha', teacherComment: 'Outstanding recitation from the very first session. Natural talent.' },
      { id: 's5-2', date: '2025-05-02', teacherName: 'Sheikh Khalid Al-Tajweed', score: 20, maxScore: 20, surah: 'Al-Ikhlas', teacherComment: 'Perfect score. Ready to move to Al-Baqarah.' },
      { id: 's5-3', date: '2025-05-16', teacherName: 'Sheikh Khalid Al-Tajweed', score: 18, maxScore: 20, surah: 'Al-Baqarah (1-5)' },
    ],
  },
  {
    id: 'sub-6',
    studentName: 'Yousef Al-Nasser',
    phone: '+971502345678',
    age: 31,
    joinDate: '2025-04-20',
    teacherName: 'Sheikh Khalid Al-Tajweed',
    teacherAge: 52,
    status: 'active',
    complaints: [],
    teacherHistory: [
      {
        teacherName: 'Sheikh Ahmed Al-Qari',
        from: '2023-09-01',
        to: '2025-04-10',
        reason: "Moved to advanced Qira'at program requiring specialist.",
      },
    ],
    sessions: [
      { id: 's6-1', date: '2023-09-10', teacherName: 'Sheikh Ahmed Al-Qari', score: 15, maxScore: 20, surah: 'Al-Fatiha' },
      { id: 's6-2', date: '2023-10-01', teacherName: 'Sheikh Ahmed Al-Qari', score: 17, maxScore: 20, surah: 'Al-Baqarah (1-5)', teacherComment: 'Good tajweed foundation. Keep revising Idgham rules.' },
      { id: 's6-3', date: '2025-04-25', teacherName: 'Sheikh Khalid Al-Tajweed', score: 17, maxScore: 20, surah: "Qira'at intro session", teacherComment: 'Solid base from previous teacher. Will advance quickly.' },
      { id: 's6-4', date: '2025-05-10', teacherName: 'Sheikh Khalid Al-Tajweed', score: 18, maxScore: 20, surah: 'Al-Fatiha (Warsh riwayah)' },
    ],
  },
  {
    id: 'sub-7',
    studentName: 'Sara Mahmoud',
    phone: '+966505678901',
    age: 17,
    joinDate: '2025-05-01',
    teacherName: 'Sheikh Ahmed Al-Qari',
    teacherAge: 45,
    status: 'active',
    complaints: [],
    teacherHistory: [],
    sessions: [
      { id: 's7-1', date: '2025-05-08', teacherName: 'Sheikh Ahmed Al-Qari', score: 17, maxScore: 20, surah: 'Al-Fatiha', teacherComment: 'Very promising student. Clear pronunciation and good memory.' },
      { id: 's7-2', date: '2025-05-22', teacherName: 'Sheikh Ahmed Al-Qari', score: 18, maxScore: 20, surah: 'Al-Ikhlas' },
    ],
  },
  {
    id: 'sub-8',
    studentName: 'Khalid Al-Qahtani',
    phone: '+966506789012',
    age: 42,
    joinDate: '2024-12-05',
    teacherName: 'Ustadha Maryam Al-Hafiz',
    teacherAge: 38,
    status: 'paused',
    complaints: [
      {
        id: 'cmp-4',
        date: '2025-02-14',
        description: 'Scheduling conflicts were not handled professionally.',
        resolved: true,
      },
    ],
    teacherHistory: [],
    sessions: [
      { id: 's8-1', date: '2024-12-10', teacherName: 'Ustadha Maryam Al-Hafiz', score: 13, maxScore: 20, surah: 'Al-Fatiha', teacherComment: 'Adult learner, patient and motivated. Needs consistent practice.' },
      { id: 's8-2', date: '2024-12-24', teacherName: 'Ustadha Maryam Al-Hafiz', score: 14, maxScore: 20, surah: 'An-Nas' },
      { id: 's8-3', date: '2025-01-07', teacherName: 'Ustadha Maryam Al-Hafiz', score: 15, maxScore: 20, surah: 'Al-Falaq', teacherComment: 'Noticeable improvement. Keep daily recitation habit.' },
    ],
  },
  {
    id: 'sub-9',
    studentName: 'Nora Al-Ghamdi',
    phone: '+966507890123',
    age: 26,
    joinDate: '2025-06-01',
    teacherName: 'Sheikh Khalid Al-Tajweed',
    teacherAge: 52,
    status: 'active',
    complaints: [],
    teacherHistory: [
      {
        teacherName: 'Ustadha Maryam Al-Hafiz',
        from: '2024-03-01',
        to: '2025-05-28',
        reason: 'Completed foundational level, transferred to advanced program.',
      },
    ],
    sessions: [
      { id: 's9-1', date: '2024-03-10', teacherName: 'Ustadha Maryam Al-Hafiz', score: 14, maxScore: 20, surah: 'Al-Fatiha' },
      { id: 's9-2', date: '2024-04-01', teacherName: 'Ustadha Maryam Al-Hafiz', score: 16, maxScore: 20, surah: 'Al-Baqarah (1-5)', teacherComment: 'Good progress. Ready for intermediate level soon.' },
      { id: 's9-3', date: '2024-06-01', teacherName: 'Ustadha Maryam Al-Hafiz', score: 17, maxScore: 20, surah: 'Al-Baqarah (6-10)' },
      { id: 's9-4', date: '2025-06-05', teacherName: 'Sheikh Khalid Al-Tajweed', score: 17, maxScore: 20, surah: 'Advanced Tajweed intro', teacherComment: 'Excellent foundation from previous teacher. Good transition.' },
    ],
  },
  {
    id: 'sub-10',
    studentName: 'Hassan Al-Shehri',
    phone: '+966508901234',
    age: 33,
    joinDate: '2025-05-15',
    teacherName: 'Sheikh Ahmed Al-Qari',
    teacherAge: 45,
    status: 'withdrawn',
    complaints: [
      {
        id: 'cmp-5',
        date: '2025-06-01',
        description: 'Recitation corrections were not detailed enough.',
        resolved: false,
      },
    ],
    teacherHistory: [],
    sessions: [
      { id: 's10-1', date: '2025-05-20', teacherName: 'Sheikh Ahmed Al-Qari', score: 13, maxScore: 20, surah: 'Al-Fatiha', teacherComment: 'Student needs to review basic Tajweed rules before next session.' },
      { id: 's10-2', date: '2025-06-03', teacherName: 'Sheikh Ahmed Al-Qari', score: 14, maxScore: 20, surah: 'An-Nas' },
    ],
  },
];

// ─── Teacher Subscriptions ────────────────────────────────────────────────────

export const mockTeacherSubscriptions: TeacherSubscription[] = [
  {
    id: 'tch-1',
    teacherName: 'Sheikh Ahmed Al-Qari',
    age: 45,
    qualifications: [
      "Ijazah in Quran recitation (Hafs 'an 'Asim)",
      'Bachelor of Islamic Studies – Al-Azhar University',
      'Master of Quranic Sciences – Madinah Islamic University',
      '20 years teaching experience',
    ],
    studentCount: 4,
    sessionCount: 187,
    reviews: [
      { id: 'rev-1', reviewerName: 'Mohammed Al-Saud', rating: 5, comment: 'Exceptional teacher with deep knowledge. Very patient and precise in corrections.', date: '2025-04-10', isAdmin: false },
      { id: 'rev-2', reviewerName: 'Fatima Al-Rashid', rating: 5, comment: 'MashaAllah, best teacher I have ever had. My recitation improved dramatically.', date: '2025-05-01', isAdmin: false },
      { id: 'rev-3', reviewerName: 'Admin – Khaled Fahad', rating: 4, comment: 'Consistently delivers high-quality sessions. Recommended for advanced students.', date: '2025-03-20', isAdmin: true },
    ],
    upcomingSessions: [
      { id: 'ses-1', date: '2026-06-18', time: '10:00 AM', studentName: 'Fatima Al-Rashid' },
      { id: 'ses-2', date: '2026-06-18', time: '11:30 AM', studentName: 'Mohammed Al-Saud' },
      { id: 'ses-3', date: '2026-06-19', time: '09:00 AM', studentName: 'Sara Mahmoud' },
      { id: 'ses-4', date: '2026-06-20', time: '04:00 PM', studentName: 'Hassan Al-Shehri' },
    ],
  },
  {
    id: 'tch-2',
    teacherName: 'Ustadha Maryam Al-Hafiz',
    age: 38,
    qualifications: [
      "Ijazah in Quran recitation (Warsh 'an Nafi')",
      'Bachelor of Quran and Sunnah Studies – Um Al-Qura University',
      '12 years teaching experience',
      'Certified Tajweed Instructor',
    ],
    studentCount: 3,
    sessionCount: 124,
    reviews: [
      { id: 'rev-4', reviewerName: 'Aisha Hassan', rating: 4, comment: 'Very knowledgeable and kind. Session structure could be more consistent.', date: '2025-04-15', isAdmin: false },
      { id: 'rev-5', reviewerName: 'Admin – Noura Basim', rating: 3, comment: 'Good teacher but needs to improve session documentation and feedback reports.', date: '2025-05-10', isAdmin: true },
    ],
    upcomingSessions: [
      { id: 'ses-5', date: '2026-06-18', time: '02:00 PM', studentName: 'Aisha Hassan' },
      { id: 'ses-6', date: '2026-06-21', time: '10:00 AM', studentName: 'Khalid Al-Qahtani' },
    ],
  },
  {
    id: 'tch-3',
    teacherName: 'Sheikh Khalid Al-Tajweed',
    age: 52,
    qualifications: [
      "Ijazah in 10 Qira'at",
      'Doctorate in Islamic Studies – International Islamic University Malaysia',
      'Author of 3 published works on Tajweed',
      '30 years teaching experience',
    ],
    studentCount: 3,
    sessionCount: 342,
    reviews: [
      { id: 'rev-6', reviewerName: 'Layla Al-Khalifa', rating: 5, comment: 'Subhanallah, truly a master. My understanding of Tajweed rules is now solid.', date: '2025-05-20', isAdmin: false },
      { id: 'rev-7', reviewerName: 'Yousef Al-Nasser', rating: 5, comment: 'World-class teacher. Every session is a blessing.', date: '2025-06-01', isAdmin: false },
      { id: 'rev-8', reviewerName: 'Admin – Khaled Fahad', rating: 5, comment: 'Our most senior and accomplished teacher. Highly recommended for all levels.', date: '2025-04-01', isAdmin: true },
    ],
    upcomingSessions: [
      { id: 'ses-7', date: '2026-06-17', time: '06:00 PM', studentName: 'Nora Al-Ghamdi' },
      { id: 'ses-8', date: '2026-06-18', time: '08:00 AM', studentName: 'Layla Al-Khalifa' },
      { id: 'ses-9', date: '2026-06-19', time: '07:30 PM', studentName: 'Yousef Al-Nasser' },
    ],
  },
];
