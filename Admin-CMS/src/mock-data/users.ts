/**
 * Mock data for users module
 */

import type { UserStatus, Gender, Country } from '@/shared/types';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: Country;
  city: string;
  organization: string;
  organizationId: string;
  gender: Gender;
  dateOfBirth: string;
  status: UserStatus;
  points: number;
  articlesViewed: number;
  webinarsAttended: number;
  storiesSubmitted: number;
  webinarsRegistered: number;
  quizzesTaken: number;
  rank: number;
  createdAt: string;
  lastActive?: string;
}

export interface UserEngagement {
  userId: string;
  userName: string;
  articlesViewed: number;
  webinarsAttended: number;
  webinarsRegistered: number;
  quizzesTaken: number;
  quizzesPassed: number;
  storiesSubmitted: number;
  totalPoints: number;
  avgQuizScore: number;
}

// Generate mock users
const firstNames = [
  'Fatima', 'Mohammed', 'Aisha', 'Ahmed', 'Nora', 'Omar', 'Layla', 'Yousef',
  'Sara', 'Khalid', 'Maryam', 'Hassan', 'Huda', 'Ali', 'Zahra', 'Ibrahim',
  'Reem', 'Faisal', 'Dina', 'Saleh', 'Jana', 'Tariq', 'Lina', 'Majid',
  'Nouf', 'Saeed', 'Amira', 'Rashid', 'Salma', 'Waleed'
];

const lastNames = [
  'Al-Rashid', 'Al-Saud', 'Mahmoud', 'Hassan', 'Al-Ahmed', 'Ibrahim',
  'Abdul-Rahman', 'Al-Khalifa', 'Al-Nasser', 'Al-Qahtani', 'Al-Otaibi',
  'Al-Ghamdi', 'Al-Shehri', 'Al-Harbi', 'Al-Dosari', 'Al-Zahrani',
  'Al-Sulaiman', 'Al-Malki', 'Al-Mutairi', 'Al-Tamimi'
];

const organizations = [
  { id: 'org-1', name: 'Riyadh Medical Center', country: 'KSA' as Country },
  { id: 'org-2', name: 'King Faisal Hospital', country: 'KSA' as Country },
  { id: 'org-3', name: 'Jeddah Clinic', country: 'KSA' as Country },
  { id: 'org-4', name: 'Dammam Hospital', country: 'KSA' as Country },
  { id: 'org-5', name: 'Dubai Healthcare City', country: 'UAE' as Country },
  { id: 'org-6', name: 'Abu Dhabi Medical', country: 'UAE' as Country },
  { id: 'org-7', name: 'Sharjah Medical Center', country: 'UAE' as Country },
  { id: 'org-8', name: 'Al Ain Hospital', country: 'UAE' as Country },
];

const cities: Record<Country, string[]> = {
  KSA: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina', 'Khobar'],
  UAE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman', 'Ras Al Khaimah'],
};

function generateUsers(count: number): User[] {
  const users: User[] = [];
  const statuses: UserStatus[] = ['active', 'active', 'active', 'active', 'inactive', 'pending'];
  const genders: Gender[] = ['Male', 'Female'];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const org = organizations[i % organizations.length];
    const gender = genders[i % 2];
    const status = statuses[i % statuses.length];
    const country = org.country;
    const city = cities[country][i % cities[country].length];
    const points = Math.floor(Math.random() * 15000) + 500;

    users.push({
      id: `user-${i + 1}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('al-', '')}@example.com`,
      phone: country === 'KSA' ? `+966${Math.floor(Math.random() * 900000000) + 100000000}` : `+971${Math.floor(Math.random() * 900000000) + 100000000}`,
      country,
      city,
      organization: org.name,
      organizationId: org.id,
      gender,
      dateOfBirth: `${1970 + Math.floor(Math.random() * 35)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      status,
      points,
      articlesViewed: Math.floor(Math.random() * 100),
      webinarsAttended: Math.floor(Math.random() * 20),
      storiesSubmitted: Math.floor(Math.random() * 5),
      webinarsRegistered: Math.floor(Math.random() * 25),
      quizzesTaken: Math.floor(Math.random() * 30),
      rank: 0,
      createdAt: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}T10:00:00Z`,
      lastActive: `2026-01-${String(Math.floor(Math.random() * 6) + 1).padStart(2, '0')}T${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:00:00Z`,
    });
  }

  // Sort by points and assign ranks
  users.sort((a, b) => b.points - a.points);
  users.forEach((user, index) => {
    user.rank = index + 1;
  });

  return users;
}

export const mockUsers: User[] = generateUsers(75);

export const mockUserEngagement: UserEngagement[] = mockUsers.slice(0, 50).map((user) => ({
  userId: user.id,
  userName: `${user.firstName} ${user.lastName}`,
  articlesViewed: user.articlesViewed,
  webinarsAttended: user.webinarsAttended,
  webinarsRegistered: user.webinarsRegistered,
  quizzesTaken: user.quizzesTaken,
  quizzesPassed: Math.floor(user.quizzesTaken * 0.75),
  storiesSubmitted: user.storiesSubmitted,
  totalPoints: user.points,
  avgQuizScore: Math.floor(Math.random() * 30) + 70,
}));
