/**
 * User leaderboard component
 */

import { useState } from 'react';
import { 
  Trophy, 
  ChevronUp, 
  ChevronDown,
  Medal
} from 'lucide-react';
import { Card, Avatar } from '@/shared/components';
import { formatNumber } from '@/shared/utils';
import type { TopUser } from '@/mock-data/dashboard';

interface LeaderboardTableProps {
  entries: TopUser[];
  isLoading?: boolean;
  limit?: number;
}

type SortField = 'rank' | 'points';
type SortDirection = 'asc' | 'desc';

const getRankBadge = (rank: number) => {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
        <Trophy className="h-4 w-4 text-yellow-600" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
        <Medal className="h-4 w-4 text-gray-500" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
        <Medal className="h-4 w-4 text-orange-600" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-8 h-8">
      <span className="text-sm font-medium text-gray-600">{rank}</span>
    </div>
  );
};

const countryFlags: Record<string, string> = {
  KSA: '🇸🇦',
  UAE: '🇦🇪',
  SA: '🇸🇦',
  AE: '🇦🇪',
};

export function LeaderboardTable({ 
  entries, 
  isLoading,
  limit = 10
}: LeaderboardTableProps) {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
    }
  };

  const sortedEntries = [...entries]
    .sort((a, b) => {
      const modifier = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'rank') {
        return (a.rank - b.rank) * modifier;
      }
      return (a.points - b.points) * modifier;
    })
    .slice(0, limit);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
    >
      {label}
      {sortField === field && (
        sortDirection === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      )}
    </button>
  );

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Top Users</h2>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Top Users</h2>
        <div className="flex items-center gap-4">
          <SortButton field="rank" label="Rank" />
          <SortButton field="points" label="Points" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Rank</th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Organization</th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Country</th>
              <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    {getRankBadge(entry.rank)}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={entry.name} size="sm" />
                    <div>
                      <p className="font-medium text-gray-900">{entry.name}</p>
                      <p className="text-xs text-gray-500">{entry.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span className="text-sm text-gray-600">{entry.organization}</span>
                </td>
                <td className="py-3 px-2">
                  <span className="flex items-center gap-1 text-sm">
                    <span>{countryFlags[entry.country] || '🌍'}</span>
                    <span className="text-gray-600">{entry.country}</span>
                  </span>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="font-semibold text-primary-600">
                    {formatNumber(entry.points)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default LeaderboardTable;
