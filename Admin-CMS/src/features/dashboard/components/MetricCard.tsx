/**
 * Metric card component for dashboard
 */

import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users,
  Building2,
  BookOpen,
  Video,
  Gift,
  MessageSquare,
  Target,
  Clock,
  UserPlus,
  Activity,
  type LucideIcon
} from 'lucide-react';
import { Card } from '@/shared/components';
import { formatNumber } from '@/shared/utils';

type MetricColor = 'primary' | 'success' | 'warning' | 'danger' | 'info';
type MetricFormat = 'number' | 'percentage' | 'duration' | 'currency';

interface MetricCardProps {
  label: string;
  value: number;
  change?: {
    value: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  icon?: string;
  color?: MetricColor;
  format?: MetricFormat;
  suffix?: string;
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  organizations: Building2,
  quizzes: BookOpen,
  articles: BookOpen,
  webinars: Video,
  products: Gift,
  stories: MessageSquare,
  engagement: Target,
  duration: Clock,
  newUsers: UserPlus,
  retention: Activity,
};

const colorClasses: Record<MetricColor, { bg: string; icon: string; trend: string }> = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'text-primary-600',
    trend: 'text-primary-600',
  },
  success: {
    bg: 'bg-success-50',
    icon: 'text-success-600',
    trend: 'text-success-600',
  },
  warning: {
    bg: 'bg-warning-50',
    icon: 'text-warning-600',
    trend: 'text-warning-600',
  },
  danger: {
    bg: 'bg-danger-50',
    icon: 'text-danger-600',
    trend: 'text-danger-600',
  },
  info: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    trend: 'text-blue-600',
  },
};

const formatValue = (value: number, format: MetricFormat): string => {
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'duration':
      // Convert seconds to readable format
      if (value >= 3600) {
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        return `${hours}h ${minutes}m`;
      } else if (value >= 60) {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}m ${seconds}s`;
      }
      return `${value}s`;
    case 'currency':
      return `$${formatNumber(value)}`;
    default:
      return formatNumber(value);
  }
};

export function MetricCard({
  label,
  value,
  change,
  icon = 'users',
  color = 'primary',
  format = 'number',
  suffix,
  className = '',
}: MetricCardProps) {
  const Icon = iconMap[icon] || Users;
  const colors = colorClasses[color];

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatValue(value, format)}
            {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
          </p>
          {change && (
            <div className="flex items-center gap-1">
              {change.trend === 'up' && (
                <TrendingUp className="h-4 w-4 text-success-600" />
              )}
              {change.trend === 'down' && (
                <TrendingDown className="h-4 w-4 text-danger-600" />
              )}
              {change.trend === 'stable' && (
                <Minus className="h-4 w-4 text-gray-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  change.trend === 'up'
                    ? 'text-success-600'
                    : change.trend === 'down'
                    ? 'text-danger-600'
                    : 'text-gray-500'
                }`}
              >
                {change.percentage > 0 ? '+' : ''}
                {change.percentage.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
      </div>
    </Card>
  );
}

export default MetricCard;
