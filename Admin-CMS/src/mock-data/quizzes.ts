/**
 * Mock data for quizzes module
 */

import type { ContentStatus, EntityStatus } from '@/shared/types';

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questionsCount: number;
  status: ContentStatus;
  totalAttempts: number;
  avgScore: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  quizId: string;
  title: string;
  text: string;
  choices: string[];
  correctIndex: number;
  rewardPoints: number;
  status: EntityStatus;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

export interface QuizAnalytics {
  quizId: string;
  quizTitle: string;
  usersAttended: number;
  averageScore: number;
  completionRate: number;
  avgTimeMinutes: number;
}

export const mockQuizzes: Quiz[] = [
  {
    id: 'quiz-1',
    title: 'Skin Care Basics',
    description: 'Test your knowledge of fundamental skin care practices and daily routines',
    questionsCount: 10,
    status: 'published',
    totalAttempts: 1234,
    avgScore: 78.5,
    createdAt: '2025-11-20T14:00:00Z',
    updatedAt: '2025-12-15T10:00:00Z',
  },
  {
    id: 'quiz-2',
    title: 'Sun Protection Essentials',
    description: 'Learn about SPF, UV protection, and proper sun care techniques',
    questionsCount: 8,
    status: 'published',
    totalAttempts: 987,
    avgScore: 82.3,
    createdAt: '2025-10-15T09:30:00Z',
  },
  {
    id: 'quiz-3',
    title: 'Acne Treatment Knowledge',
    description: 'Understanding acne causes, treatments, and prevention methods',
    questionsCount: 12,
    status: 'published',
    totalAttempts: 756,
    avgScore: 71.2,
    createdAt: '2025-09-10T11:00:00Z',
  },
  {
    id: 'quiz-4',
    title: 'Anti-Aging Skincare',
    description: 'Explore anti-aging ingredients, routines, and best practices',
    questionsCount: 10,
    status: 'published',
    totalAttempts: 645,
    avgScore: 75.8,
    createdAt: '2025-08-20T14:30:00Z',
  },
  {
    id: 'quiz-5',
    title: 'Moisturization 101',
    description: 'Master the art of skin hydration and moisturizer selection',
    questionsCount: 6,
    status: 'published',
    totalAttempts: 1102,
    avgScore: 88.4,
    createdAt: '2025-07-15T10:00:00Z',
  },
  {
    id: 'quiz-6',
    title: 'Sensitive Skin Care',
    description: 'Special considerations for managing sensitive and reactive skin',
    questionsCount: 8,
    status: 'draft',
    totalAttempts: 0,
    avgScore: 0,
    createdAt: '2025-12-28T09:00:00Z',
  },
  {
    id: 'quiz-7',
    title: 'Winter Skin Protection',
    description: 'Seasonal skincare tips for cold and dry weather conditions',
    questionsCount: 7,
    status: 'published',
    totalAttempts: 423,
    avgScore: 79.6,
    createdAt: '2025-11-01T08:30:00Z',
  },
  {
    id: 'quiz-8',
    title: 'Dermatology Fundamentals',
    description: 'Basic dermatological concepts for healthcare professionals',
    questionsCount: 15,
    status: 'published',
    totalAttempts: 890,
    avgScore: 68.9,
    createdAt: '2025-06-10T11:15:00Z',
  },
];

export const mockQuestions: Question[] = [
  // Quiz 1: Skin Care Basics
  {
    id: 'q1-1',
    quizId: 'quiz-1',
    title: 'SPF Protection',
    text: 'What is the minimum recommended SPF for daily sun protection?',
    choices: ['SPF 15', 'SPF 30', 'SPF 50', 'SPF 70'],
    correctIndex: 1,
    rewardPoints: 10,
    status: 'active',
    order: 1,
    createdAt: '2025-11-20T14:15:00Z',
  },
  {
    id: 'q1-2',
    quizId: 'quiz-1',
    title: 'Cleansing Order',
    text: 'In a double cleansing routine, which type of cleanser should be used first?',
    choices: ['Foam cleanser', 'Oil-based cleanser', 'Gel cleanser', 'Cream cleanser'],
    correctIndex: 1,
    rewardPoints: 10,
    status: 'active',
    order: 2,
    createdAt: '2025-11-20T14:20:00Z',
  },
  {
    id: 'q1-3',
    quizId: 'quiz-1',
    title: 'Moisturizer Timing',
    text: 'When is the best time to apply moisturizer for maximum absorption?',
    choices: ['On completely dry skin', 'On damp skin', 'Before washing face', 'Any time'],
    correctIndex: 1,
    rewardPoints: 10,
    status: 'active',
    order: 3,
    createdAt: '2025-11-20T14:25:00Z',
  },
  {
    id: 'q1-4',
    quizId: 'quiz-1',
    title: 'Exfoliation Frequency',
    text: 'How often should most people exfoliate their face?',
    choices: ['Daily', '1-3 times per week', 'Once a month', 'Never'],
    correctIndex: 1,
    rewardPoints: 10,
    status: 'active',
    order: 4,
    createdAt: '2025-11-20T14:30:00Z',
  },
  {
    id: 'q1-5',
    quizId: 'quiz-1',
    title: 'Vitamin C Benefits',
    text: 'What is the primary benefit of Vitamin C in skincare?',
    choices: ['Hydration', 'Antioxidant protection', 'Oil control', 'Exfoliation'],
    correctIndex: 1,
    rewardPoints: 10,
    status: 'active',
    order: 5,
    createdAt: '2025-11-20T14:35:00Z',
  },
  // Quiz 2: Sun Protection
  {
    id: 'q2-1',
    quizId: 'quiz-2',
    title: 'UVA vs UVB',
    text: 'Which type of UV ray is primarily responsible for skin aging?',
    choices: ['UVA', 'UVB', 'UVC', 'All equally'],
    correctIndex: 0,
    rewardPoints: 15,
    status: 'active',
    order: 1,
    createdAt: '2025-10-15T09:45:00Z',
  },
  {
    id: 'q2-2',
    quizId: 'quiz-2',
    title: 'Sunscreen Reapplication',
    text: 'How often should sunscreen be reapplied when outdoors?',
    choices: ['Every 30 minutes', 'Every 2 hours', 'Every 4 hours', 'Once per day'],
    correctIndex: 1,
    rewardPoints: 15,
    status: 'active',
    order: 2,
    createdAt: '2025-10-15T09:50:00Z',
  },
  // Quiz 3: Acne Treatment
  {
    id: 'q3-1',
    quizId: 'quiz-3',
    title: 'Acne Cause',
    text: 'What is the primary cause of acne?',
    choices: ['Dirty skin', 'Excess sebum and clogged pores', 'Eating chocolate', 'Stress alone'],
    correctIndex: 1,
    rewardPoints: 12,
    status: 'active',
    order: 1,
    createdAt: '2025-09-10T11:15:00Z',
  },
  {
    id: 'q3-2',
    quizId: 'quiz-3',
    title: 'Salicylic Acid',
    text: 'Salicylic acid is best used for treating which type of acne?',
    choices: ['Cystic acne', 'Blackheads and whiteheads', 'Nodular acne', 'Hormonal acne'],
    correctIndex: 1,
    rewardPoints: 12,
    status: 'active',
    order: 2,
    createdAt: '2025-09-10T11:20:00Z',
  },
];

export const mockQuizAnalytics: QuizAnalytics[] = mockQuizzes
  .filter((q) => q.status === 'published')
  .map((quiz) => ({
    quizId: quiz.id,
    quizTitle: quiz.title,
    usersAttended: quiz.totalAttempts,
    averageScore: quiz.avgScore,
    completionRate: Math.floor(Math.random() * 15) + 85,
    avgTimeMinutes: Math.floor(Math.random() * 10) + 5,
  }));
