/**
 * Card component for dashboard metrics and content
 */

import type { ReactNode } from 'react';
import { cn } from '../../utils';

interface CardProps {
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Card content */
  children: ReactNode;
  /** Header action */
  headerAction?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Additional class name */
  className?: string;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Border style */
  bordered?: boolean;
  /** Hover effect */
  hoverable?: boolean;
  /** Click handler */
  onClick?: () => void;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4 lg:p-5',
  lg: 'p-5 lg:p-6',
};

export function Card({
  title,
  subtitle,
  children,
  headerAction,
  footer,
  className,
  padding = 'md',
  bordered = true,
  hoverable = false,
  onClick,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(
        'bg-white rounded-xl',
        bordered && 'border border-gray-200',
        'shadow-sm',
        hoverable && 'hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        className
      )}
      onClick={onClick}
    >
      {(title || headerAction) && (
        <div className={cn('flex items-center justify-between', paddingStyles[padding], 'border-b border-gray-100')}>
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
      {footer && (
        <div className={cn(paddingStyles[padding], 'border-t border-gray-100 bg-gray-50 rounded-b-xl')}>
          {footer}
        </div>
      )}
    </Component>
  );
}

export default Card;
