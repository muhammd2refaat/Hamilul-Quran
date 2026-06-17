/**
 * Country leaderboard component
 */

import { Globe, Users, Target } from 'lucide-react';
import { Card } from '@/shared/components';
import { formatNumber } from '@/shared/utils';
import type { CountryLeaderboardItem } from '@/mock-data/dashboard';

interface CountryLeaderboardProps {
  entries: CountryLeaderboardItem[];
  isLoading?: boolean;
}

export function CountryLeaderboard({ entries, isLoading }: CountryLeaderboardProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Country Leaderboard</h2>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">Country Leaderboard</h2>
      </div>

      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div
            key={entry.country}
            className={`p-4 rounded-lg ${
              index === 0 ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">{entry.flag}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{entry.countryName}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {formatNumber(entry.totalUsers)} users
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {formatNumber(entry.averagePoints)} avg pts
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">
                  {formatNumber(entry.totalPoints)}
                </div>
                <div className="text-xs text-gray-500">total points</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Users</span>
          <span className="font-semibold text-gray-900">
            {formatNumber(entries.reduce((sum, e) => sum + e.totalUsers, 0))}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-600">Total Points</span>
          <span className="font-semibold text-gray-900">
            {formatNumber(entries.reduce((sum, e) => sum + e.totalPoints, 0))}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default CountryLeaderboard;
