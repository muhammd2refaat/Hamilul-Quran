/**
 * Status badge component for displaying entity status
 */

import { cn } from '../../utils';

type BadgeVariant = 
  | 'active' 
  | 'inactive' 
  | 'pending' 
  | 'published' 
  | 'draft' 
  | 'unpublished'
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'cancelled'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'default'
  | 'danger'
  | 'rejected'
  | 'approved';

interface StatusBadgeProps {
  /** Status variant */
  status: BadgeVariant;
  /** Custom label (uses status name if not provided) */
  label?: string;
  /** Size of the badge */
  size?: 'sm' | 'md';
  /** Additional class name */
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  published: 'bg-blue-100 text-blue-800',
  draft: 'bg-gray-100 text-gray-600',
  unpublished: 'bg-orange-100 text-orange-800',
  scheduled: 'bg-purple-100 text-purple-800',
  live: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-700',
  danger: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
};

const dotStyles: Record<BadgeVariant, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  pending: 'bg-yellow-500',
  published: 'bg-blue-500',
  draft: 'bg-gray-400',
  unpublished: 'bg-orange-500',
  scheduled: 'bg-purple-500',
  live: 'bg-red-500 animate-pulse',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  default: 'bg-gray-500',
  danger: 'bg-red-500',
  rejected: 'bg-red-500',
  approved: 'bg-green-500',
};

const defaultLabels: Record<BadgeVariant, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  published: 'Published',
  draft: 'Draft',
  unpublished: 'Unpublished',
  scheduled: 'Scheduled',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
  default: 'Unknown',
  danger: 'Danger',
  rejected: 'Rejected',
  approved: 'Approved',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function StatusBadge({
  status,
  label,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const displayLabel = label || defaultLabels[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variantStyles[status],
        sizeStyles[size],
        className
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', dotStyles[status])}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
}

export default StatusBadge;
