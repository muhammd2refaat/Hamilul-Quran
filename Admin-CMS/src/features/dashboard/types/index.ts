/**
 * Dashboard module types
 */

export interface DashboardMetrics {
  totalUsers: number;
  pendingUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalCountries: number;
  totalOrganizations: number;
  totalQuizzes: number;
  totalArticlesPublished: number;
  totalWebinars: number;
  totalStories: number;
  totalProducts: number;
  totalCategories: number;
}

export interface MetricChange {
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  change: MetricChange;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  format: 'number' | 'percentage' | 'duration' | 'currency';
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  previousRank: number;
  name: string;
  avatar?: string;
  organization?: string;
  country: string;
  countryCode: string;
  points: number;
  quizzesCompleted: number;
  articlesRead: number;
  webinarsAttended: number;
  storiesShared: number;
  streak: number;
}

export interface CountryLeaderboardEntry {
  country: string;
  countryCode: string;
  flag: string;
  totalUsers: number;
  activeUsers: number;
  totalPoints: number;
  averageEngagement: number;
  topOrganization?: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  label: string;
  data: ChartDataPoint[];
  color: string;
}

export interface EngagementTrend {
  period: string;
  quizzes: number;
  articles: number;
  webinars: number;
  stories: number;
  products: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: 'quiz_completed' | 'article_read' | 'webinar_attended' | 'story_shared' | 'product_redeemed' | 'badge_earned';
  target: string;
  points?: number;
  timestamp: string;
}

export interface DashboardFilters {
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  organization?: string;
  country?: string;
}

export interface DashboardState {
  filters: DashboardFilters;
  isLoading: boolean;
  metrics: DashboardMetrics | null;
  leaderboard: LeaderboardEntry[];
  countryLeaderboard: CountryLeaderboardEntry[];
  engagementTrends: EngagementTrend[];
  recentActivity: RecentActivity[];
}
