/**
 * Empty state component
 */

import { Inbox } from 'lucide-react';
import { cn } from '../../utils';
import { Button } from '../Button';

interface EmptyStateProps {
  /** Title */
  title?: string;
  /** Description */
  description?: string;
  /** Icon */
  icon?: React.ElementType;
  /** Action button text */
  actionText?: string;
  /** Action callback */
  onAction?: () => void;
  /** Additional class name */
  className?: string;
}

export function EmptyState({
  title = 'No data',
  description = 'There are no items to display.',
  icon: Icon = Inbox,
  actionText,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction}>{actionText}</Button>
      )}
    </div>
  );
}

export default EmptyState;
