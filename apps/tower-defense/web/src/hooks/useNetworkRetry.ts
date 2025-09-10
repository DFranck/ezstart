'use client'

import { useCallback, useState } from 'react'

interface RetryOptions {
  maxRetries?: number
  delay?: number
  backoff?: number
}

interface RetryState {
  retryCount: number
  isRetrying: boolean
  lastError: Error | null
}

export function useNetworkRetry(options: RetryOptions = {}) {
  const { maxRetries = 3, delay = 1000, backoff = 2 } = options
  const [state, setState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    lastError: null,
  })

  const executeWithRetry = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      let lastError: Error
      let attempt = 0

      while (attempt <= maxRetries) {
        try {
          setState(prev => ({ ...prev, isRetrying: attempt > 0, retryCount: attempt }))
          
          if (attempt > 0) {
            // Attendre avec backoff exponentiel
            const waitTime = delay * Math.pow(backoff, attempt - 1)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }

          const result = await operation()
          
          // Succès, réinitialiser l'état
          setState({ retryCount: 0, isRetrying: false, lastError: null })
          return result
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          attempt++

          if (attempt > maxRetries) {
            // Échec final
            setState({ retryCount: attempt - 1, isRetrying: false, lastError })
            throw lastError
          }

          // Continuer avec le prochain essai
          setState(prev => ({ ...prev, lastError }))
        }
      }

      throw lastError!
    },
    [maxRetries, delay, backoff]
  )

  const reset = useCallback(() => {
    setState({ retryCount: 0, isRetrying: false, lastError: null })
  }, [])

  return {
    ...state,
    executeWithRetry,
    reset,
  }
}