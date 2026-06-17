/**
 * Mock data for webinars module
 */

import type { WebinarStatus, Country } from '@/shared/types';

export interface Webinar {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  speakerName: string;
  speakerTitle: string;
  zoomUrl: string;
  meetingId: string;
  capacity: number;
  countryVisibility: Country[];
  bannerImage?: string;
  status: WebinarStatus;
  registrations: number;
  attendance: number;
  createdAt: string;
  updatedAt?: string;
}

export interface WebinarAttendee {
  userId: string;
  userName: string;
  userEmail: string;
  organization: string;
  country: Country;
  registeredAt: string;
  attended: boolean;
  joinedAt?: string;
  leftAt?: string;
  watchDurationMinutes?: number;
}

export interface WebinarAnalytics {
  webinarId: string;
  webinarTitle: string;
  registrations: number;
  attendance: number;
  attendanceRate: number;
  avgWatchTimeMinutes: number;
  peakViewers: number;
}

export const mockWebinars: Webinar[] = [
  {
    id: 'webinar-1',
    title: 'Advanced Dermatology: Treating Acne in Adults',
    description: 'Expert insights on adult acne treatment protocols, including hormonal acne management and combination therapy approaches',
    date: '2026-02-15',
    startTime: '18:00',
    endTime: '19:30',
    duration: 90,
    speakerName: 'Dr. Layla Al-Mansouri',
    speakerTitle: 'Consultant Dermatologist',
    zoomUrl: 'https://zoom.us/j/123456789',
    meetingId: '123 456 789',
    capacity: 500,
    countryVisibility: ['KSA', 'UAE'],
    bannerImage: '/uploads/webinars/acne-treatment.jpg',
    status: 'scheduled',
    registrations: 342,
    attendance: 0,
    createdAt: '2026-01-05T12:00:00Z',
  },
  {
    id: 'webinar-2',
    title: 'Skin Cancer Prevention and Early Detection',
    description: 'Learn about the latest approaches in skin cancer screening, prevention strategies, and early warning signs',
    date: '2026-01-20',
    startTime: '19:00',
    endTime: '20:30',
    duration: 90,
    speakerName: 'Dr. Ahmed Al-Rashid',
    speakerTitle: 'Oncology Dermatologist',
    zoomUrl: 'https://zoom.us/j/234567890',
    meetingId: '234 567 890',
    capacity: 400,
    countryVisibility: ['KSA'],
    bannerImage: '/uploads/webinars/skin-cancer.jpg',
    status: 'scheduled',
    registrations: 189,
    attendance: 0,
    createdAt: '2025-12-20T10:00:00Z',
  },
  {
    id: 'webinar-3',
    title: 'Innovations in Psoriasis Treatment',
    description: 'Exploring new biologic therapies and treatment protocols for moderate to severe psoriasis',
    date: '2025-12-15',
    startTime: '17:00',
    endTime: '18:30',
    duration: 90,
    speakerName: 'Dr. Sara Hassan',
    speakerTitle: 'Senior Dermatologist',
    zoomUrl: 'https://zoom.us/j/345678901',
    meetingId: '345 678 901',
    capacity: 350,
    countryVisibility: ['KSA', 'UAE'],
    bannerImage: '/uploads/webinars/psoriasis.jpg',
    status: 'completed',
    registrations: 287,
    attendance: 234,
    createdAt: '2025-11-20T09:00:00Z',
  },
  {
    id: 'webinar-4',
    title: 'Cosmetic Dermatology: Latest Trends',
    description: 'An overview of the newest cosmetic procedures and non-invasive treatments',
    date: '2025-11-28',
    startTime: '18:30',
    endTime: '20:00',
    duration: 90,
    speakerName: 'Dr. Fatima Al-Saud',
    speakerTitle: 'Cosmetic Dermatologist',
    zoomUrl: 'https://zoom.us/j/456789012',
    meetingId: '456 789 012',
    capacity: 500,
    countryVisibility: ['UAE'],
    bannerImage: '/uploads/webinars/cosmetic.jpg',
    status: 'completed',
    registrations: 456,
    attendance: 389,
    createdAt: '2025-11-01T11:00:00Z',
  },
  {
    id: 'webinar-5',
    title: 'Pediatric Dermatology Essentials',
    description: 'Common skin conditions in children and evidence-based treatment approaches',
    date: '2025-11-10',
    startTime: '16:00',
    endTime: '17:30',
    duration: 90,
    speakerName: 'Dr. Mohammed Al-Qahtani',
    speakerTitle: 'Pediatric Dermatologist',
    zoomUrl: 'https://zoom.us/j/567890123',
    meetingId: '567 890 123',
    capacity: 300,
    countryVisibility: ['KSA', 'UAE'],
    bannerImage: '/uploads/webinars/pediatric.jpg',
    status: 'completed',
    registrations: 198,
    attendance: 167,
    createdAt: '2025-10-15T14:00:00Z',
  },
  {
    id: 'webinar-6',
    title: 'Managing Eczema in Adults',
    description: 'Comprehensive approach to adult eczema management including lifestyle modifications',
    date: '2026-03-10',
    startTime: '19:00',
    endTime: '20:30',
    duration: 90,
    speakerName: 'Dr. Nora Ibrahim',
    speakerTitle: 'Dermatology Specialist',
    zoomUrl: 'https://zoom.us/j/678901234',
    meetingId: '678 901 234',
    capacity: 400,
    countryVisibility: ['KSA', 'UAE'],
    bannerImage: '/uploads/webinars/eczema.jpg',
    status: 'scheduled',
    registrations: 87,
    attendance: 0,
    createdAt: '2026-01-02T10:00:00Z',
  },
];

export const mockWebinarAttendees: WebinarAttendee[] = [
  {
    userId: 'user-1',
    userName: 'Fatima Al-Rashid',
    userEmail: 'fatima@example.com',
    organization: 'Riyadh Medical Center',
    country: 'KSA',
    registeredAt: '2025-12-10T14:30:00Z',
    attended: true,
    joinedAt: '2025-12-15T16:58:00Z',
    leftAt: '2025-12-15T18:28:00Z',
    watchDurationMinutes: 90,
  },
  {
    userId: 'user-2',
    userName: 'Mohammed Al-Saud',
    userEmail: 'mohammed@example.com',
    organization: 'King Faisal Hospital',
    country: 'KSA',
    registeredAt: '2025-12-08T09:15:00Z',
    attended: true,
    joinedAt: '2025-12-15T17:05:00Z',
    leftAt: '2025-12-15T18:30:00Z',
    watchDurationMinutes: 85,
  },
  {
    userId: 'user-3',
    userName: 'Aisha Mahmoud',
    userEmail: 'aisha@example.com',
    organization: 'Dubai Healthcare City',
    country: 'UAE',
    registeredAt: '2025-12-05T11:00:00Z',
    attended: true,
    joinedAt: '2025-12-15T17:00:00Z',
    leftAt: '2025-12-15T18:15:00Z',
    watchDurationMinutes: 75,
  },
  {
    userId: 'user-4',
    userName: 'Khalid Ibrahim',
    userEmail: 'khalid@example.com',
    organization: 'Abu Dhabi Medical',
    country: 'UAE',
    registeredAt: '2025-12-12T16:45:00Z',
    attended: false,
  },
  {
    userId: 'user-5',
    userName: 'Nora Al-Ahmed',
    userEmail: 'nora@example.com',
    organization: 'Jeddah Clinic',
    country: 'KSA',
    registeredAt: '2025-12-14T10:00:00Z',
    attended: true,
    joinedAt: '2025-12-15T17:02:00Z',
    leftAt: '2025-12-15T18:30:00Z',
    watchDurationMinutes: 88,
  },
];

export const mockWebinarAnalytics: WebinarAnalytics[] = mockWebinars
  .filter((w) => w.status === 'completed')
  .map((webinar) => ({
    webinarId: webinar.id,
    webinarTitle: webinar.title,
    registrations: webinar.registrations,
    attendance: webinar.attendance,
    attendanceRate: Math.round((webinar.attendance / webinar.registrations) * 100),
    avgWatchTimeMinutes: Math.floor(Math.random() * 20) + 70,
    peakViewers: Math.floor(webinar.attendance * 0.95),
  }));
