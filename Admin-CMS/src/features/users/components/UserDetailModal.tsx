/**
 * User detail modal - simplified version
 */

import {
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Modal, Avatar, StatusBadge, Card } from '@/shared/components';
import { formatDate } from '@/shared/utils';
import type { User } from '../store/usersStore';

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColorMap: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',   ACTIVE: 'success',
  inactive: 'default', INACTIVE: 'default',
  pending: 'warning',  PENDING: 'warning',
  suspended: 'danger', SUSPENDED: 'danger',
};

const countryNames: Record<string, string> = {
  KSA: 'Saudi Arabia',
  UAE: 'United Arab Emirates',
};

export function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  if (!user) return null;

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
          </div>
        </Card>
      </div>
    </Modal>
  );
}

export default UserDetailModal;
