/**
 * User detail modal - simplified version
 */

import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Trophy,
  BookOpen,
  Video,
  MessageSquare,
} from 'lucide-react';
import { Modal, Avatar, StatusBadge, Card } from '@/shared/components';
import { formatDate, formatNumber, formatRelativeTime } from '@/shared/utils';
import type { User } from '@/mock-data/users';
import type { UserStatus } from '@/shared/types';

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColorMap: Record<UserStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
};

const countryNames: Record<string, string> = {
  KSA: 'Saudi Arabia',
  UAE: 'United Arab Emirates',
};

export function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  if (!user) return null;

  const stats = [
    { label: 'Points', value: user.points, icon: Trophy, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'Quizzes', value: user.quizzesTaken, icon: BookOpen, color: 'text-primary-600 bg-primary-100' },
    { label: 'Articles', value: user.articlesViewed, icon: BookOpen, color: 'text-purple-600 bg-purple-100' },
    { label: 'Webinars', value: user.webinarsAttended, icon: Video, color: 'text-orange-600 bg-orange-100' },
    { label: 'Stories', value: user.storiesSubmitted, icon: MessageSquare, color: 'text-success-600 bg-success-100' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar
            name={`${user.firstName} ${user.lastName}`}
            size="xl"
          />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-gray-500">{user.email}</p>
            <div className="mt-2">
              <StatusBadge status={statusColorMap[user.status]} label={user.status} />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Contact Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{user.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">
                {user.city}, {countryNames[user.country]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{user.organization}</span>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Activity Stats
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-3 bg-gray-50 rounded-lg"
              >
                <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-2`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatNumber(stat.value)}
                </p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Dates */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Account Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Joined:</span>
              <span className="text-gray-900">{formatDate(user.createdAt)}</span>
            </div>
            {user.lastActive && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Last Active:</span>
                <span className="text-gray-900">
                  {formatRelativeTime(user.lastActive)}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Modal>
  );
}

export default UserDetailModal;
