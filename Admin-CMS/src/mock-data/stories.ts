/**
 * Mock data for stories module
 */

import type { Country } from '@/shared/types';

export type StoryStatus = 'published' | 'unpublished' | 'pending';

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  title: string;
  content: string;
  organization: string;
  country: Country;
  submittedAt: string;
  status: StoryStatus;
  publishedAt?: string;
  viewCount: number;
  likeCount: number;
}

export interface StoryAnalytics {
  totalStories: number;
  publishedStories: number;
  unpublishedStories: number;
  pendingStories: number;
  totalViews: number;
  totalLikes: number;
  avgViewsPerStory: number;
}

export const mockStories: Story[] = [
  {
    id: 'story-1',
    authorId: 'user-15',
    authorName: 'Sarah Ahmed',
    authorEmail: 'sarah.ahmed@example.com',
    title: 'My Journey with Eczema: Finding Relief',
    content: `I've struggled with eczema since childhood. The constant itching, the red patches, and the self-consciousness that came with it. 
    
For years, I tried countless products with little success. The turning point came when I finally saw a dermatologist who took the time to understand my triggers and create a personalized treatment plan.

Today, my skin is the healthiest it's ever been. I've learned to identify my triggers, maintain a consistent skincare routine, and most importantly, be patient with the healing process.

To anyone struggling with eczema: don't give up. The right treatment is out there for you.`,
    organization: 'Dubai Healthcare City',
    country: 'UAE',
    submittedAt: '2026-01-03T16:45:00Z',
    status: 'published',
    publishedAt: '2026-01-04T09:00:00Z',
    viewCount: 234,
    likeCount: 45,
  },
  {
    id: 'story-2',
    authorId: 'user-78',
    authorName: 'Mohammed Hassan',
    authorEmail: 'mohammed.hassan@example.com',
    title: 'Overcoming Psoriasis Through Lifestyle Changes',
    content: `Living with psoriasis taught me that medication is only part of the solution. The real breakthrough came when I started making lifestyle changes.

I reduced stress through meditation, changed my diet to include more anti-inflammatory foods, and committed to regular exercise. 

The plaques on my skin reduced significantly within months. My dermatologist was impressed with the improvement.

This journey showed me the connection between mind, body, and skin health.`,
    organization: 'Riyadh Medical Center',
    country: 'KSA',
    submittedAt: '2026-01-04T11:20:00Z',
    status: 'unpublished',
    viewCount: 0,
    likeCount: 0,
  },
  {
    id: 'story-3',
    authorId: 'user-23',
    authorName: 'Fatima Al-Dosari',
    authorEmail: 'fatima.dosari@example.com',
    title: 'Adult Acne: Breaking the Stigma',
    content: `At 35, I never expected to be dealing with acne. The embarrassment was overwhelming, and I felt like everyone was judging me.

Working with my dermatologist, I learned that adult acne is incredibly common, especially in women. We developed a treatment plan that included topical retinoids and gentle skincare products.

More importantly, I learned to stop being so hard on myself. Skin conditions don't define us.`,
    organization: 'King Faisal Hospital',
    country: 'KSA',
    submittedAt: '2026-01-02T09:30:00Z',
    status: 'published',
    publishedAt: '2026-01-02T14:00:00Z',
    viewCount: 567,
    likeCount: 89,
  },
  {
    id: 'story-4',
    authorId: 'user-45',
    authorName: 'Omar Al-Khalifa',
    authorEmail: 'omar.khalifa@example.com',
    title: 'Sun Damage Reversal: My 1-Year Journey',
    content: `Years of sun exposure without proper protection left my skin with dark spots and premature wrinkles. I decided to document my journey to reverse the damage.

With guidance from my dermatologist, I started using vitamin C, retinol, and religiously applying sunscreen every single day.

After one year, the improvement is remarkable. My skin looks 10 years younger.`,
    organization: 'Abu Dhabi Medical',
    country: 'UAE',
    submittedAt: '2025-12-28T15:00:00Z',
    status: 'published',
    publishedAt: '2025-12-29T10:00:00Z',
    viewCount: 892,
    likeCount: 156,
  },
  {
    id: 'story-5',
    authorId: 'user-67',
    authorName: 'Layla Abdul-Rahman',
    authorEmail: 'layla.ar@example.com',
    title: 'Managing Rosacea in the Gulf Heat',
    content: `Living in the UAE with rosacea presents unique challenges. The extreme heat and humidity can trigger flare-ups constantly.

I've learned to adapt my lifestyle: avoiding midday sun, using mineral sunscreen, and keeping my skincare routine simple and gentle.

My tips for fellow rosacea sufferers in hot climates: invest in a good hat, keep facial mists handy, and never skip your evening routine.`,
    organization: 'Sharjah Medical Center',
    country: 'UAE',
    submittedAt: '2025-12-25T12:00:00Z',
    status: 'published',
    publishedAt: '2025-12-26T09:00:00Z',
    viewCount: 445,
    likeCount: 78,
  },
  {
    id: 'story-6',
    authorId: 'user-89',
    authorName: 'Ahmed Al-Mutairi',
    authorEmail: 'ahmed.mutairi@example.com',
    title: 'Dealing with Hair Loss: A Man\'s Perspective',
    content: `Hair loss at 28 was devastating for my self-esteem. I tried everything: supplements, special shampoos, even considered surgery.

Finally, I consulted a dermatologist who explained the science behind male pattern baldness and presented me with realistic options.

I'm now on a treatment plan that has significantly slowed the progression. More importantly, I've accepted that hair doesn't define masculinity.`,
    organization: 'Jeddah Clinic',
    country: 'KSA',
    submittedAt: '2026-01-05T10:15:00Z',
    status: 'pending',
    viewCount: 0,
    likeCount: 0,
  },
  {
    id: 'story-7',
    authorId: 'user-34',
    authorName: 'Nora Ibrahim',
    authorEmail: 'nora.ibrahim@example.com',
    title: 'Vitiligo: Learning to Love My Skin',
    content: `When the white patches first appeared, I was terrified. Vitiligo changed my appearance, but it ultimately taught me about true self-acceptance.

My dermatologist helped me understand the condition and provided treatment options. But the real healing came from within.

Today, I embrace my unique skin. It tells my story.`,
    organization: 'Dammam Hospital',
    country: 'KSA',
    submittedAt: '2025-12-20T14:30:00Z',
    status: 'published',
    publishedAt: '2025-12-21T11:00:00Z',
    viewCount: 723,
    likeCount: 134,
  },
  {
    id: 'story-8',
    authorId: 'user-56',
    authorName: 'Yousef Al-Ghamdi',
    authorEmail: 'yousef.ghamdi@example.com',
    title: 'Defeating Athlete\'s Foot: Prevention Tips',
    content: `As someone who frequents the gym, athlete's foot was a recurring nightmare. The itching and discomfort affected my daily life.

After multiple consultations, I learned the importance of foot hygiene and proper treatment. Simple changes like using shower shoes and keeping feet dry made all the difference.`,
    organization: 'Mecca Medical Complex',
    country: 'KSA',
    submittedAt: '2025-12-15T08:00:00Z',
    status: 'published',
    publishedAt: '2025-12-15T16:00:00Z',
    viewCount: 312,
    likeCount: 42,
  },
];

export const mockStoryAnalytics: StoryAnalytics = {
  totalStories: mockStories.length,
  publishedStories: mockStories.filter((s) => s.status === 'published').length,
  unpublishedStories: mockStories.filter((s) => s.status === 'unpublished').length,
  pendingStories: mockStories.filter((s) => s.status === 'pending').length,
  totalViews: mockStories.reduce((sum, s) => sum + s.viewCount, 0),
  totalLikes: mockStories.reduce((sum, s) => sum + s.likeCount, 0),
  avgViewsPerStory: Math.round(
    mockStories.reduce((sum, s) => sum + s.viewCount, 0) /
      mockStories.filter((s) => s.status === 'published').length
  ),
};
