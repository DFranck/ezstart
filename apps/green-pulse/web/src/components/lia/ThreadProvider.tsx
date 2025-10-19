'use client'

import type { ThreadAPIConfig, UseThreadAPIReturn } from '@ezstart/ui/hooks'
import { useThreadAPI } from '@ezstart/ui/hooks'
import { createContext, ReactNode, useContext } from 'react'

type ThreadProviderProps = {
  children: ReactNode
  config: ThreadAPIConfig
}

const ThreadContext = createContext<UseThreadAPIReturn | undefined>(undefined)

/**
 * Provider réutilisable pour connecter les composants Thread à une API
 *
 * @example
 * ```tsx
 * <ThreadProvider config={{ endpoint: '/api/chat' }}>
 *   <Thread>
 *     <ThreadMessages />
 *   </Thread>
 *   <ThreadComposer />
 * </ThreadProvider>
 * ```
 */
export function ThreadProvider({ children, config }: ThreadProviderProps) {
  const thread = useThreadAPI(config)

  return <ThreadContext.Provider value={thread}>{children}</ThreadContext.Provider>
}

/**
 * Hook pour accéder au contexte Thread
 */
export function useThreadContext() {
  const context = useContext(ThreadContext)
  if (!context) {
    throw new Error('useThreadContext must be used within a ThreadProvider')
  }
  return context
}
