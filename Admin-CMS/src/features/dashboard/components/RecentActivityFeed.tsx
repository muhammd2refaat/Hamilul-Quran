/**
 * Recent activity feed component
 */

import { 
  BookOpen, 
  Video, 
  MessageSquare, 
  Gift, 
  Award, 
  FileText,
  Clock
} from 'lucide-react';
import { Card, Avatar } from '@/shared/components';
import { formatRelativeTime } from '@/shared/utils';
import type { RecentActivity } from '../types';

interface RecentActivityFeedProps {
  activities: RecentActivity[];
  isLoading?: boolean;
  limit?: number;
}

const activityConfig: Record<RecentActivity['action'], { 
  icon: typeof BookOpen; 
  color: string; 
  label: string 
}> = {
  quiz_completed: { icon: BookOpen, color: 'text-primary-600 bg-primary-100', label: 'completed quiz' },
  article_read: { icon: FileText, color: 'text-purple-600 bg-purple-100', label: 'read article' },
  webinar_attended: { icon: Video, color: 'text-orange-600 bg-orange-100', label: 'attended webinar' },
  story_shared: { icon: MessageSquare, color: 'text-success-600 bg-success-100', label: 'shared story' },
  product_redeemed: { icon: Gift, color: 'text-danger-600 bg-danger-100', label: 'redeemed' },
  badge_earned: { icon: Award, color: 'text-yellow-600 bg-yellow-100', label: 'earned badge' },
};

export function RecentActivityFeed({ activities, isLoading, limit = 10 }: RecentActivityFeedProps) {
  const displayActivities = activities.slice(0, limit);

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Recent Activity
        </h3>
        <span className="text-sm text-gray-500">{activities.length} activities</span>
      </div>

      <div className="space-y-4">
        {displayActivities.map((activity) => {
          const config = activityConfig[activity.action];
          const Icon = config.icon;

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
            >
              <Avatar
                src={activity.userAvatar}
                name={activity.userName}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{activity.userName}</span>
                  <span className="text-gray-500">{config.label}</span>
                  <span className="font-medium text-gray-900 truncate">{activity.target}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                  {activity.points && (
                    <span className="text-xs font-medium text-success-600">
                      +{activity.points} pts
                    </span>
                  )}
                </div>
              </div>
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          );
        })}
      </div>

      {activities.length > limit && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all activity
          </button>
        </div>
      )}
    </Card>
  );
}

export default RecentActivityFeed;
