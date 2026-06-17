/**
 * Dashboard metrics grid component
 */

import { MetricCard } from './MetricCard';
import type { DashboardMetrics } from '../types';

interface DashboardMetricsGridProps {
  metrics: DashboardMetrics;
  isLoading?: boolean;
}

interface MetricConfig {
  key: keyof DashboardMetrics;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  format: 'number' | 'percentage' | 'duration';
}

const metricsConfig: MetricConfig[] = [
  { key: 'totalUsers', label: 'Total Registered Users', icon: 'users', color: 'primary', format: 'number' },
  { key: 'pendingUsers', label: 'Total Pending Users', icon: 'users', color: 'warning', format: 'number' },
  { key: 'activeUsers', label: 'Total Active Users', icon: 'users', color: 'success', format: 'number' },
  { key: 'inactiveUsers', label: 'Total Inactive Users', icon: 'users', color: 'danger', format: 'number' },
  { key: 'totalCountries', label: 'Total Countries Created', icon: 'globe', color: 'info', format: 'number' },
  { key: 'totalOrganizations', label: 'Total Organizations Created', icon: 'organizations', color: 'primary', format: 'number' },
  { key: 'totalQuizzes', label: 'Total Quizzes Created', icon: 'quizzes', color: 'info', format: 'number' },
  { key: 'totalArticlesPublished', label: 'Total Articles Published', icon: 'articles', color: 'success', format: 'number' },
  { key: 'totalWebinars', label: 'Total Webinars Created', icon: 'webinars', color: 'warning', format: 'number' },
  { key: 'totalStories', label: 'Total Stories Submitted', icon: 'stories', color: 'primary', format: 'number' },
  { key: 'totalProducts', label: 'Total Products Created', icon: 'products', color: 'danger', format: 'number' },
  { key: 'totalCategories', label: 'Total Categories Created', icon: 'categories', color: 'info', format: 'number' },
];

// Mock change data - in real app this would come from API
const mockChanges: Record<string, { value: number; percentage: number; trend: 'up' | 'down' | 'stable' }> = {
  totalUsers: { value: 234, percentage: 12.5, trend: 'up' },
  pendingUsers: { value: 12, percentage: 9.2, trend: 'up' },
  activeUsers: { value: 156, percentage: 8.3, trend: 'up' },
  inactiveUsers: { value: -5, percentage: -4.8, trend: 'down' },
  totalCountries: { value: 0, percentage: 0, trend: 'stable' },
  totalOrganizations: { value: 3, percentage: 15.0, trend: 'up' },
  totalQuizzes: { value: 4, percentage: 16.7, trend: 'up' },
  totalArticlesPublished: { value: 12, percentage: 8.3, trend: 'up' },
  totalWebinars: { value: 2, percentage: 6.3, trend: 'up' },
  totalStories: { value: 67, percentage: 9.8, trend: 'up' },
  totalProducts: { value: 5, percentage: 8.1, trend: 'up' },
  totalCategories: { value: 1, percentage: 14.3, trend: 'up' },
};

export function DashboardMetricsGrid({ metrics, isLoading }: DashboardMetricsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-8 bg-gray-200 rounded w-20" />
                <div className="h-3 bg-gray-200 rounded w-32" />
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {metricsConfig.map((config) => (
        <MetricCard
          key={config.key}
          label={config.label}
          value={metrics[config.key]}
          change={mockChanges[config.key]}
          icon={config.icon}
          color={config.color}
          format={config.format}
        />
      ))}
    </div>
  );
}

export default DashboardMetricsGrid;
