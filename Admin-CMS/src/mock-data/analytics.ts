/**
 * Mock Analytics Data
 */

export interface QuizAnalytics {
  id: string;
  title: string;
  usersAttended: number;
  averageScore: number;
  completionRate: number;
}

export interface WebinarAnalytics {
  id: string;
  title: string;
  totalRegistrations: number;
  registrationRate: number;
  actualAttendance: number;
  attendanceRate: number;
  attendees: WebinarAttendee[];
}

export interface WebinarAttendee {
  id: string;
  name: string;
  email: string;
  organization: string;
  attendedAt: string;
}

export interface ArticleAnalytics {
  id: string;
  title: string;
  totalViews: number;
  uniqueViewers: number;
  averageReadTime: number;
}

export interface StoryAnalytics {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  organization: string;
  title: string;
  submittedAt: string;
  status: 'approved' | 'pending' | 'rejected';
}

export const mockQuizAnalytics: QuizAnalytics[] = [
  { id: '1', title: 'Medical Terminology Basics', usersAttended: 1234, averageScore: 85.5, completionRate: 92.3 },
  { id: '2', title: 'Patient Care Standards', usersAttended: 987, averageScore: 78.2, completionRate: 88.7 },
  { id: '3', title: 'Healthcare Ethics', usersAttended: 756, averageScore: 91.3, completionRate: 95.1 },
  { id: '4', title: 'Infection Control', usersAttended: 1156, averageScore: 82.7, completionRate: 90.4 },
  { id: '5', title: 'Emergency Response', usersAttended: 843, averageScore: 87.9, completionRate: 89.6 },
];

export const mockWebinarAnalytics: WebinarAnalytics[] = [
  {
    id: '1',
    title: 'Latest Advances in Dermatology',
    totalRegistrations: 450,
    registrationRate: 17.7,
    actualAttendance: 342,
    attendanceRate: 76.0,
    attendees: [
      { id: 'u1', name: 'Fatima Al-Rashid', email: 'fatima@example.com', organization: 'Riyadh Medical Center', attendedAt: '2025-12-15T10:00:00Z' },
      { id: 'u2', name: 'Mohammed Al-Saud', email: 'mohammed@example.com', organization: 'King Faisal Hospital', attendedAt: '2025-12-15T10:02:00Z' },
      { id: 'u3', name: 'Aisha Mahmoud', email: 'aisha@example.com', organization: 'Dubai Healthcare City', attendedAt: '2025-12-15T10:01:00Z' },
    ],
  },
  {
    id: '2',
    title: 'Skincare During Seasonal Changes',
    totalRegistrations: 380,
    registrationRate: 14.9,
    actualAttendance: 298,
    attendanceRate: 78.4,
    attendees: [
      { id: 'u4', name: 'Khalid Ibrahim', email: 'khalid@example.com', organization: 'Abu Dhabi Medical', attendedAt: '2025-12-20T14:00:00Z' },
      { id: 'u5', name: 'Nora Al-Ahmed', email: 'nora@example.com', organization: 'Jeddah Clinic', attendedAt: '2025-12-20T14:03:00Z' },
    ],
  },
  {
    id: '3',
    title: 'Managing Acne in Adults',
    totalRegistrations: 520,
    registrationRate: 20.4,
    actualAttendance: 445,
    attendanceRate: 85.6,
    attendees: [
      { id: 'u6', name: 'Omar Hassan', email: 'omar@example.com', organization: 'Sharjah Medical Center', attendedAt: '2025-12-22T16:00:00Z' },
    ],
  },
];

export const mockArticleAnalytics: ArticleAnalytics[] = [
  { id: '1', title: 'Understanding Skin Care Basics', totalViews: 5432, uniqueViewers: 3210, averageReadTime: 4.5 },
  { id: '2', title: 'The Importance of Sun Protection', totalViews: 4987, uniqueViewers: 2876, averageReadTime: 3.8 },
  { id: '3', title: 'Nutrition and Skin Health', totalViews: 3654, uniqueViewers: 2134, averageReadTime: 5.2 },
  { id: '4', title: 'Managing Acne in Adults', totalViews: 6321, uniqueViewers: 3987, averageReadTime: 6.1 },
  { id: '5', title: 'Anti-Aging Skincare Routine', totalViews: 4123, uniqueViewers: 2456, averageReadTime: 4.7 },
];

export const mockStoryAnalytics: StoryAnalytics[] = [
  { id: '1', userId: 'u1', userName: 'Fatima Al-Rashid', userEmail: 'fatima@example.com', organization: 'Riyadh Medical Center', title: 'My Journey with Skincare', submittedAt: '2025-12-10T08:30:00Z', status: 'approved' },
  { id: '2', userId: 'u2', userName: 'Mohammed Al-Saud', userEmail: 'mohammed@example.com', organization: 'King Faisal Hospital', title: 'How I Improved My Skin Health', submittedAt: '2025-12-12T10:15:00Z', status: 'approved' },
  { id: '3', userId: 'u3', userName: 'Aisha Mahmoud', userEmail: 'aisha@example.com', organization: 'Dubai Healthcare City', title: 'Dealing with Acne', submittedAt: '2025-12-14T14:20:00Z', status: 'pending' },
  { id: '4', userId: 'u4', userName: 'Khalid Ibrahim', userEmail: 'khalid@example.com', organization: 'Abu Dhabi Medical', title: 'Sun Protection Tips', submittedAt: '2025-12-16T09:45:00Z', status: 'approved' },
  { id: '5', userId: 'u5', userName: 'Nora Al-Ahmed', userEmail: 'nora@example.com', organization: 'Jeddah Clinic', title: 'My Skincare Routine', submittedAt: '2025-12-18T11:00:00Z', status: 'approved' },
];
