'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { AIClient } from './ai-client.js'

interface AIContextValue {
  client: AIClient
  appName: string
}

const AIContext = createContext<AIContextValue | undefined>(undefined)

interface AIProviderProps {
  children: ReactNode
  appName: string
  getToken?: () => string | null
}

export function AIProvider({ children, appName, getToken }: AIProviderProps) {
  const client = useMemo(() => new AIClient({ appName, getToken }), [appName, getToken])
  const value = useMemo(() => ({ client, appName }), [client, appName])
  return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

export function useAIContext() {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error('useAIContext must be used within an AIProvider')
  }
  return context
}
