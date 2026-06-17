/**
 * React Query configuration
 */

import { QueryClient } from '@tanstack/react-query';
import { CACHE } from '@/shared/constants';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE.STALE_TIME,
      gcTime: CACHE.STATIC_DATA,
      retry: CACHE.RETRY_COUNT,
      retryDelay: (attemptIndex) =>
        Math.min(CACHE.RETRY_DELAY * Math.pow(2, attemptIndex), 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: CACHE.RETRY_DELAY,
    },
  },
});

export default queryClient;
