/**
 * Mock data for articles module
 */

import type { ContentStatus } from '@/shared/types';

export interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  thumbnail?: string;
  videoUrl?: string;
  status: ContentStatus;
  rewardPoints: number;
  viewCount: number;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface ArticleAnalytics {
  articleId: string;
  articleTitle: string;
  totalViews: number;
  uniqueViewers: number;
  avgReadTimeMinutes: number;
  completionRate: number;
}

export const mockArticles: Article[] = [
  {
    id: 'article-1',
    title: 'The Complete Guide to Winter Skin Care',
    description: 'Protect your skin during cold weather with these essential tips and product recommendations',
    content: `
      <h2>Why Winter Skin Care Matters</h2>
      <p>Cold weather, low humidity, and indoor heating can wreak havoc on your skin. During winter months, the skin barrier becomes compromised, leading to dryness, irritation, and sensitivity.</p>
      
      <h3>Key Steps for Winter Skin Care</h3>
      <ul>
        <li><strong>Switch to a gentler cleanser</strong> - Avoid foaming cleansers that strip natural oils</li>
        <li><strong>Layer your hydration</strong> - Use a hydrating toner, serum, and rich moisturizer</li>
        <li><strong>Don't skip sunscreen</strong> - UV rays are still present in winter</li>
        <li><strong>Use a humidifier</strong> - Combat dry indoor air</li>
      </ul>
      
      <h3>Recommended Ingredients</h3>
      <p>Look for products containing hyaluronic acid, ceramides, glycerin, and squalane for optimal winter hydration.</p>
    `,
    thumbnail: '/uploads/articles/winter-skincare.jpg',
    status: 'published',
    rewardPoints: 15,
    viewCount: 3456,
    createdAt: '2025-12-01T10:00:00Z',
    publishedAt: '2025-12-01T12:00:00Z',
  },
  {
    id: 'article-2',
    title: 'Understanding Your Skin Type',
    description: 'Learn how to identify your skin type and choose the right products for your needs',
    content: `
      <h2>The Five Main Skin Types</h2>
      <p>Understanding your skin type is the foundation of an effective skincare routine.</p>
      
      <h3>1. Normal Skin</h3>
      <p>Well-balanced, not too oily or dry. Minimal imperfections and small pores.</p>
      
      <h3>2. Dry Skin</h3>
      <p>Feels tight, may have flaking or rough patches. Needs extra hydration.</p>
      
      <h3>3. Oily Skin</h3>
      <p>Shiny appearance, enlarged pores, prone to breakouts.</p>
      
      <h3>4. Combination Skin</h3>
      <p>Oily T-zone with dry cheeks. Requires balanced approach.</p>
      
      <h3>5. Sensitive Skin</h3>
      <p>Easily irritated, prone to redness and reactions.</p>
    `,
    thumbnail: '/uploads/articles/skin-types.jpg',
    status: 'published',
    rewardPoints: 10,
    viewCount: 5234,
    createdAt: '2025-11-15T09:00:00Z',
    publishedAt: '2025-11-15T10:00:00Z',
  },
  {
    id: 'article-3',
    title: 'The Science Behind Retinoids',
    description: 'Everything you need to know about retinoids and how they transform your skin',
    content: `
      <h2>What Are Retinoids?</h2>
      <p>Retinoids are vitamin A derivatives that have been proven to treat acne, reduce wrinkles, and improve skin texture.</p>
      
      <h3>Types of Retinoids</h3>
      <ul>
        <li><strong>Retinol</strong> - Over-the-counter, gentler option</li>
        <li><strong>Retinaldehyde</strong> - More potent than retinol</li>
        <li><strong>Tretinoin</strong> - Prescription-strength, most effective</li>
        <li><strong>Adapalene</strong> - Good for acne-prone skin</li>
      </ul>
      
      <h3>How to Start</h3>
      <p>Begin with a low concentration and use only 2-3 times per week. Always wear sunscreen during the day.</p>
    `,
    thumbnail: '/uploads/articles/retinoids.jpg',
    status: 'published',
    rewardPoints: 20,
    viewCount: 2890,
    createdAt: '2025-11-01T14:00:00Z',
    publishedAt: '2025-11-02T09:00:00Z',
  },
  {
    id: 'article-4',
    title: 'Hydration vs Moisturization: Know the Difference',
    description: 'Understanding the key differences between hydrating and moisturizing your skin',
    content: `
      <h2>Hydration vs Moisturization</h2>
      <p>These terms are often used interchangeably, but they serve different purposes in skincare.</p>
      
      <h3>Hydration</h3>
      <p>Refers to water content in the skin. Hydrating ingredients (humectants) attract water to skin cells.</p>
      
      <h3>Moisturization</h3>
      <p>Refers to trapping moisture in the skin. Moisturizing ingredients (occlusives) create a barrier.</p>
    `,
    thumbnail: '/uploads/articles/hydration.jpg',
    status: 'published',
    rewardPoints: 12,
    viewCount: 4123,
    createdAt: '2025-10-20T11:00:00Z',
    publishedAt: '2025-10-20T12:00:00Z',
  },
  {
    id: 'article-5',
    title: 'Sunscreen: Your Daily Essential',
    description: 'Why sunscreen is the most important step in your skincare routine',
    content: `
      <h2>The Importance of Daily Sunscreen</h2>
      <p>UV exposure is responsible for up to 90% of visible skin aging. Daily sunscreen use is essential.</p>
      
      <h3>Chemical vs Physical Sunscreens</h3>
      <p>Chemical sunscreens absorb UV rays, while physical sunscreens reflect them.</p>
    `,
    thumbnail: '/uploads/articles/sunscreen.jpg',
    status: 'published',
    rewardPoints: 15,
    viewCount: 6789,
    createdAt: '2025-10-01T10:00:00Z',
    publishedAt: '2025-10-01T11:00:00Z',
  },
  {
    id: 'article-6',
    title: 'Treating Hyperpigmentation',
    description: 'Effective strategies for fading dark spots and evening skin tone',
    content: `
      <h2>Understanding Hyperpigmentation</h2>
      <p>Hyperpigmentation occurs when excess melanin forms deposits in the skin.</p>
    `,
    thumbnail: '/uploads/articles/hyperpigmentation.jpg',
    status: 'draft',
    rewardPoints: 18,
    viewCount: 0,
    createdAt: '2025-12-28T15:00:00Z',
  },
  {
    id: 'article-7',
    title: 'Building an Evening Skincare Routine',
    description: 'Step-by-step guide to creating the perfect nighttime skincare regimen',
    content: `
      <h2>Why Evening Skincare Matters</h2>
      <p>Nighttime is when your skin repairs and regenerates.</p>
    `,
    thumbnail: '/uploads/articles/evening-routine.jpg',
    status: 'published',
    rewardPoints: 12,
    viewCount: 3567,
    createdAt: '2025-09-15T09:00:00Z',
    publishedAt: '2025-09-15T10:00:00Z',
  },
  {
    id: 'article-8',
    title: 'Acne Scarring: Prevention and Treatment',
    description: 'Learn how to prevent acne scars and treat existing ones effectively',
    content: `
      <h2>Types of Acne Scars</h2>
      <p>Understanding the type of scarring you have helps determine the best treatment.</p>
    `,
    thumbnail: '/uploads/articles/acne-scars.jpg',
    status: 'published',
    rewardPoints: 20,
    viewCount: 4890,
    createdAt: '2025-09-01T14:30:00Z',
    publishedAt: '2025-09-02T09:00:00Z',
  },
];

export const mockArticleAnalytics: ArticleAnalytics[] = mockArticles
  .filter((a) => a.status === 'published')
  .map((article) => ({
    articleId: article.id,
    articleTitle: article.title,
    totalViews: article.viewCount,
    uniqueViewers: Math.floor(article.viewCount * 0.85),
    avgReadTimeMinutes: Math.floor(Math.random() * 5) + 3,
    completionRate: Math.floor(Math.random() * 20) + 75,
  }));
