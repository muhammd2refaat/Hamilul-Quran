/**
 * Loading spinner component
 */

import { Loader2 } from 'lucide-react';
import { cn } from '../../utils';

interface LoadingSpinnerProps {
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Full screen overlay */
  fullScreen?: boolean;
  /** Loading text */
  text?: string;
  /** Additional class name */
  className?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingSpinner({
  size = 'md',
  fullScreen = false,
  text,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary-600', sizeStyles[size])} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
