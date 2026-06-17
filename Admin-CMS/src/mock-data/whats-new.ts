/**
 * Mock data for What's New module
 */

import type { WhatsNewItem } from '../features/whats-new/types';

export const mockWhatsNewItems: WhatsNewItem[] = [
  {
    id: 'wn-1',
    title: 'Featured: Skin Care Basics Quiz',
    userTitle: 'Test Your Skin Care Knowledge',
    itemType: 'quiz',
    itemId: 'quiz-1',
    itemTitle: 'Skin Care Basics',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400',
    createdAt: '2026-01-08T10:00:00Z',
    updatedAt: '2026-01-08T10:00:00Z',
  },
  {
    id: 'wn-2',
    title: 'New Article: Winter Skin Care Guide',
    userTitle: 'Protect Your Skin This Winter',
    itemType: 'article',
    itemId: 'article-1',
    itemTitle: 'The Complete Guide to Winter Skin Care',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400',
    createdAt: '2026-01-07T14:30:00Z',
  },
  {
    id: 'wn-3',
    title: 'Upcoming Webinar: Advanced Dermatology',
    userTitle: 'Join Our Expert Session',
    itemType: 'webinar',
    itemId: 'webinar-1',
    itemTitle: 'Advanced Dermatology Techniques 2026',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
    createdAt: '2026-01-06T09:15:00Z',
  },
];
