'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

/**
 * React Query Provider for GreenPulse
 *
 * Provides caching, deduplication, and automatic background refetching
 * for all API calls in the application.
 *
 * Default config:
 * - staleTime: 5 minutes (data considered fresh for 5min)
 * - cacheTime: 10 minutes (cache persists for 10min)
 * - retry: 1 (retry failed requests once)
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache persists for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Refetch on window focus (disabled by default)
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools (only in development) */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
