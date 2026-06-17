/**
 * Custom hook for responsive breakpoints
 */

import { useState, useEffect } from 'react';
import { BREAKPOINTS } from '../constants';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useBreakpoint(): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: Breakpoint | null;
} {
  const isSm = useMediaQuery(`(min-width: ${BREAKPOINTS.SM}px)`);
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.MD}px)`);
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.LG}px)`);
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.XL}px)`);
  const is2xl = useMediaQuery(`(min-width: ${BREAKPOINTS['2XL']}px)`);

  const breakpoint: Breakpoint | null = is2xl
    ? '2xl'
    : isXl
    ? 'xl'
    : isLg
    ? 'lg'
    : isMd
    ? 'md'
    : isSm
    ? 'sm'
    : null;

  return {
    isMobile: !isMd,
    isTablet: isMd && !isLg,
    isDesktop: isLg,
    breakpoint,
  };
}

export default useMediaQuery;
