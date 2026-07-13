/**
 * Language switcher — toggles the app between English and Arabic (RTL).
 */
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppLanguage } from '@/i18n';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || 'en').startsWith('ar')
    ? 'ar'
    : 'en';

  const next: AppLanguage = current === 'ar' ? 'en' : 'ar';
  const label = current === 'ar' ? 'English' : 'العربية';

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      title={label}
      className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors ${className}`}
    >
      <Languages className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

export default LanguageSwitcher;
