'use client'

import { useState, useCallback } from 'react'

export interface ErrorState {
  message: string
  code?: string
  retryable: boolean
  timestamp: number
}

export interface ErrorHandlerConfig {
  maxRetries?: number
  retryDelay?: number
  showToast?: boolean
}

export function useErrorHandler(config: ErrorHandlerConfig = {}) {
  const { maxRetries = 3, retryDelay = 1000, showToast = true } = config
  const [errors, setErrors] = useState<ErrorState[]>([])
  const [isRetrying, setIsRetrying] = useState(false)

  const addError = useCallback((error: Error | string, retryable = true) => {
    const errorState: ErrorState = {
      message: typeof error === 'string' ? error : error.message,
      code: error instanceof Error ? error.name : undefined,
      retryable,
      timestamp: Date.now()
    }
    
    setErrors(prev => [...prev, errorState])
    
    // Auto-remove error after 10 seconds
    setTimeout(() => {
      setErrors(prev => prev.filter(e => e.timestamp !== errorState.timestamp))
    }, 10000)
  }, [])

  const clearError = useCallback((timestamp: number) => {
    setErrors(prev => prev.filter(e => e.timestamp !== timestamp))
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors([])
  }, [])

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T> => {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          setIsRetrying(true)
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt - 1)))
        }
        
        const result = await operation()
        setIsRetrying(false)
        return result
      } catch (error) {
        lastError = error as Error
        
        if (onError) {
          onError(lastError, attempt)
        }
        
        if (attempt === maxRetries) {
          addError(lastError, false)
        } else {
          addError(`Attempt ${attempt} failed: ${lastError.message}`, true)
        }
      }
    }
    
    setIsRetrying(false)
    throw lastError!
  }, [maxRetries, retryDelay, addError])

  return {
    errors,
    isRetrying,
    addError,
    clearError,
    clearAllErrors,
    executeWithRetry
  }
}