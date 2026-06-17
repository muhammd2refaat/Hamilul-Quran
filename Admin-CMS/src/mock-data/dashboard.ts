/**
 * Mock data for dashboard module
 */

import type { TimeSeriesDataPoint, ChartDataPoint } from '@/shared/types';

export interface DashboardMetrics {
  totalUsers: number;
  pendingUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalCountries: number;
  totalOrganizations: number;
  totalQuizzes: number;
  totalArticles: number;
  totalWebinars: number;
  totalStories: number;
  totalProducts: number;
  totalCategories: number;
}

export interface TopUser {
  id: string;
  name: string;
  email: string;
  country: string;
  organization: string;
  points: number;
  rank: number;
}

export interface CountryLeaderboardItem {
  country: string;
  countryName: string;
  flag: string;
  totalPoints: number;
  totalUsers: number;
  averagePoints: number;
}

export const mockDashboardMetrics: DashboardMetrics = {
  totalUsers: 2547,
  pendingUsers: 142,
  activeUsers: 2305,
  inactiveUsers: 100,
  totalCountries: 2,
  totalOrganizations: 45,
  totalQuizzes: 28,
  totalArticles: 156,
  totalWebinars: 34,
  totalStories: 891,
  totalProducts: 67,
  totalCategories: 8,
};

export const mockTopUsers: TopUser[] = [
  {
    id: '1',
    name: 'Fatima Al-Rashid',
    email: 'fatima@example.com',
    country: 'KSA',
    organization: 'Riyadh Medical Center',
    points: 15420,
    rank: 1,
  },
  {
    id: '2',
    name: 'Mohammed Al-Saud',
    email: 'mohammed.saud@example.com',
    country: 'KSA',
    organization: 'King Faisal Hospital',
    points: 14890,
    rank: 2,
  },
  {
    id: '3',
    name: 'Aisha Mahmoud',
    email: 'aisha.m@example.com',
    country: 'UAE',
    organization: 'Dubai Healthcare City',
    points: 14320,
    rank: 3,
  },
  {
    id: '4',
    name: 'Khalid Ibrahim',
    email: 'khalid.i@example.com',
    country: 'UAE',
    organization: 'Abu Dhabi Medical',
    points: 13950,
    rank: 4,
  },
  {
    id: '5',
    name: 'Nora Al-Ahmed',
    email: 'nora.a@example.com',
    country: 'KSA',
    organization: 'Jeddah Clinic',
    points: 13200,
    rank: 5,
  },
  {
    id: '6',
    name: 'Omar Hassan',
    email: 'omar.h@example.com',
    country: 'UAE',
    organization: 'Sharjah Medical Center',
    points: 12870,
    rank: 6,
  },
  {
    id: '7',
    name: 'Layla Abdul-Rahman',
    email: 'layla.ar@example.com',
    country: 'KSA',
    organization: 'Riyadh Medical Center',
    points: 12540,
    rank: 7,
  },
  {
    id: '8',
    name: 'Yousef Al-Khalifa',
    email: 'yousef.k@example.com',
    country: 'UAE',
    organization: 'Dubai Healthcare City',
    points: 12100,
    rank: 8,
  },
  {
    id: '9',
    name: 'Sara Al-Nasser',
    email: 'sara.n@example.com',
    country: 'KSA',
    organization: 'Dammam Hospital',
    points: 11780,
    rank: 9,
  },
  {
    id: '10',
    name: 'Ahmed Al-Qahtani',
    email: 'ahmed.q@example.com',
    country: 'KSA',
    organization: 'King Faisal Hospital',
    points: 11450,
    rank: 10,
  },
];

export const mockCountryLeaderboard: CountryLeaderboardItem[] = [
  {
    country: 'KSA',
    countryName: 'Saudi Arabia',
    flag: '🇸🇦',
    totalPoints: 1245678,
    totalUsers: 1523,
    averagePoints: 817,
  },
  {
    country: 'UAE',
    countryName: 'United Arab Emirates',
    flag: '🇦🇪',
    totalPoints: 987543,
    totalUsers: 1024,
    averagePoints: 964,
  },
];

export const mockUserGrowthData: TimeSeriesDataPoint[] = [
  { date: '2025-07-01', value: 1800, newUsers: 120 },
  { date: '2025-08-01', value: 1920, newUsers: 135 },
  { date: '2025-09-01', value: 2055, newUsers: 145 },
  { date: '2025-10-01', value: 2200, newUsers: 160 },
  { date: '2025-11-01', value: 2360, newUsers: 150 },
  { date: '2025-12-01', value: 2510, newUsers: 180 },
  { date: '2026-01-01', value: 2547, newUsers: 37 },
];

export const mockUserStatusDistribution: ChartDataPoint[] = [
  { name: 'Active', value: 2305 },
  { name: 'Inactive', value: 100 },
  { name: 'Pending', value: 142 },
];

export const mockUsersByCountry: ChartDataPoint[] = [
  { name: 'Saudi Arabia', value: 1523, color: '#3b82f6' },
  { name: 'UAE', value: 1024, color: '#22c55e' },
];

export const mockPointsDistribution: ChartDataPoint[] = [
  { name: '0-1000', value: 450 },
  { name: '1001-5000', value: 890 },
  { name: '5001-10000', value: 720 },
  { name: '10001-15000', value: 380 },
  { name: '15000+', value: 107 },
];

export const mockEngagementOverTime: TimeSeriesDataPoint[] = [
  { date: '2025-12-01', value: 12500, quizzes: 4500, articles: 5200, webinars: 2800 },
  { date: '2025-12-08', value: 13200, quizzes: 4800, articles: 5500, webinars: 2900 },
  { date: '2025-12-15', value: 14100, quizzes: 5100, articles: 5900, webinars: 3100 },
  { date: '2025-12-22', value: 11800, quizzes: 4200, articles: 4800, webinars: 2800 },
  { date: '2025-12-29', value: 15500, quizzes: 5600, articles: 6300, webinars: 3600 },
  { date: '2026-01-05', value: 14800, quizzes: 5300, articles: 6100, webinars: 3400 },
];
