'use client'

import { useState, useCallback } from 'react'

interface RetryConfig {
  maxRetries?: number
  delay?: number
  backoff?: boolean
}

export function useNetworkRetry(config: RetryConfig = {}) {
  const { maxRetries = 3, delay = 1000, backoff = true } = config
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T> => {
    let lastError: Error
    let currentDelay = delay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setIsRetrying(attempt > 1)
        setRetryCount(attempt - 1)
        
        const result = await operation()
        
        // Reset on success
        setIsRetrying(false)
        setRetryCount(0)
        
        return result
      } catch (error) {
        lastError = error as Error
        
        if (onError) {
          onError(lastError, attempt)
        }
        
        // Don't wait on last attempt
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, currentDelay))
          
          if (backoff) {
            currentDelay *= 2 // Exponential backoff
          }
        }
      }
    }
    
    setIsRetrying(false)
    setRetryCount(0)
    throw lastError!
  }, [maxRetries, delay, backoff])

  return {
    executeWithRetry,
    isRetrying,
    retryCount
  }
}