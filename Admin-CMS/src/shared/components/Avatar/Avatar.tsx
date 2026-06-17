/**
 * Avatar component for user display
 */

import { cn, getInitials, stringToColor } from '../../utils';

interface AvatarProps {
  /** User name */
  name?: string;
  /** Image URL */
  src?: string;
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Shape */
  shape?: 'circle' | 'square';
  /** Additional class name */
  className?: string;
}

const sizeStyles = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const shapeStyles = {
  circle: 'rounded-full',
  square: 'rounded-lg',
};

export function Avatar({
  name = '',
  src,
  size = 'md',
  shape = 'circle',
  className,
}: AvatarProps) {
  const initials = getInitials(name);
  const backgroundColor = stringToColor(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'object-cover',
          sizeStyles[size],
          shapeStyles[shape],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center font-medium text-white',
        sizeStyles[size],
        shapeStyles[shape],
        className
      )}
      style={{ backgroundColor }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

export default Avatar;
