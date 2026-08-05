import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Dashboard/auth routes are behind login (and add no SEO value — real
// enforcement is client-side + backend-side, see proxy.ts), so keep crawlers
// out of them. Everything else, including the AI answer-engine crawlers
// below, is explicitly welcomed — that's the whole point of this file.
const PRIVATE_PATHS = ['/dashboard/', '/auth/', '/register/complete', '/register/required'];

// Crawlers that power AI answer engines / assistants (ChatGPT, Claude,
// Gemini via Google-Extended, Perplexity) plus the usual search + social
// bots. Listed individually (rather than relying on the wildcard rule alone)
// so it's unambiguous that these are intentionally allowed, not just
// falling through a default-allow.
const AI_AND_SEARCH_BOTS = [
  'Googlebot',
  'Google-Extended',
  'Bingbot',
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot',
  'Applebot-Extended',
  'facebookexternalhit',
  'Twitterbot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
