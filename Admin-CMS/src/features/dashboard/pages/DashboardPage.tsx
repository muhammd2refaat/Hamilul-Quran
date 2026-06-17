/**
 * Dashboard page component
 */

import { useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { Button } from '@/shared/components';
import {
  DashboardMetricsGrid,
  LeaderboardTable,
  CountryLeaderboard,
  EngagementChart,
  DateRangeFilter,
  UserEngagementTable,
  OrganizationAnalyticsTable,
  QuizAnalyticsTable,
  WebinarAnalyticsTable,
  ArticleAnalyticsTable,
  StoryAnalyticsTable,
} from '../components';
import {
  useDashboardStore,
  getDashboardMetrics,
  getLeaderboard,
  getCountryLeaderboard,
  getEngagementTrends,
} from '../store';

export function DashboardPage() {
  const { filters, setFilters, isLoading, fetchDashboardData } = useDashboardStore();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleExport = () => {
    // In real app, this would export dashboard data
    console.log('Exporting dashboard data...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of platform engagement and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter
            value={filters.dateRange}
            onChange={(dateRange) => setFilters({ dateRange })}
            onCustomDateChange={(startDate, endDate) =>
              setFilters({ dateRange: 'custom', startDate, endDate })
            }
          />
          <Button variant="outline" onClick={() => fetchDashboardData()}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <DashboardMetricsGrid metrics={getDashboardMetrics()} isLoading={isLoading} />

      {/* Leaderboard & Points Metrics Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Leaderboard & Points Metrics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 10 Users by Points */}
          <LeaderboardTable entries={getLeaderboard()} isLoading={isLoading} limit={10} />
          {/* Country Leaderboard */}
          <CountryLeaderboard entries={getCountryLeaderboard()} isLoading={isLoading} />
        </div>
      </div>

      {/* User Status Analytics View */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">User Status Analytics</h2>
        <UserEngagementTable isLoading={isLoading} />
      </div>

      {/* Organization Analytics View */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Organization Analytics</h2>
        <OrganizationAnalyticsTable isLoading={isLoading} />
      </div>

      {/* Quiz Analytics View */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Quiz Analytics</h2>
        <QuizAnalyticsTable isLoading={isLoading} />
      </div>

      {/* Webinar Analytics View */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Webinar Analytics</h2>
        <WebinarAnalyticsTable isLoading={isLoading} />
      </div>

      {/* Article Analytics */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Article Analytics</h2>
        <ArticleAnalyticsTable isLoading={isLoading} />
      </div>

      {/* Story Analytics */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Story Analytics</h2>
        <StoryAnalyticsTable isLoading={isLoading} />
      </div>

      {/* Engagement Trends Chart */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Engagement Trends</h2>
        <EngagementChart data={getEngagementTrends()} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default DashboardPage;
