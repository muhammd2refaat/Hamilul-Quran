/**
 * Localized display name for a subscription Plan. Plan.name is always
 * English (set by an admin in Admin-CMS); Plan.name_ar is optional — an
 * admin may not bother setting it for every plan. When it's missing and the
 * page is in Arabic, we don't want to silently show the raw English name
 * (which is exactly the gap that prompted this file — plan names staying
 * English when the site language was switched to Arabic), so a label is
 * computed instead from the plan's actual shape (sessions/week, duration).
 */
import type { Plan, SubscriptionPlan } from '@/types/dashboard';

function arabicSessionsPhrase(sessionsPerWeek: number): string {
  if (sessionsPerWeek === 1) return 'حلقه واحده اسبوعيا';
  if (sessionsPerWeek === 2) return 'حلقتين اسبوعيا';
  return `${sessionsPerWeek} حلقات اسبوعيا`;
}

export function getPlanDisplayName(plan: Plan | SubscriptionPlan, lang: 'en' | 'ar'): string {
  if (lang === 'ar') {
    return plan.name_ar || `${arabicSessionsPhrase(plan.sessions_per_week)} - ${plan.session_duration_minutes} دقيقة`;
  }
  return plan.name;
}
