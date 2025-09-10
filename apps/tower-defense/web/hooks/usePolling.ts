'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface PollingConfig {
  interval: number
  enabled?: boolean
  maxRetries?: number
  retryDelay?: number
  onError?: (error: Error) => void
  onSuccess?: (data: any) => void
}

export function usePolling<T>(
  fetchFunction: () => Promise<T>,
  config: PollingConfig
) {
  const { 
    interval, 
    enabled = true, 
    maxRetries = 3, 
    retryDelay = 1000,
    onError,
    onSuccess
  } = config

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const executeFetch = useCallback(async (isRetry = false) => {
    if (!isMountedRef.current) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await fetchFunction()
      
      if (isMountedRef.current) {
        setData(result)
        setRetryCount(0)
        onSuccess?.(result)
      }
    } catch (err) {
      if (!isMountedRef.current) return
      
      const error = err as Error
      setError(error)
      onError?.(error)
      
      // Retry logic
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1)
        retryTimeoutRef.current = setTimeout(() => {
          executeFetch(true)
        }, retryDelay * (retryCount + 1))
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [fetchFunction, retryCount, maxRetries, retryDelay, onError, onSuccess])

  const startPolling = useCallback(() => {
    if (intervalRef.current) return
    
    executeFetch()
    intervalRef.current = setInterval(() => {
      executeFetch()
    }, interval)
  }, [executeFetch, interval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  const refetch = useCallback(() => {
    stopPolling()
    setRetryCount(0)
    executeFetch()
  }, [stopPolling, executeFetch])

  useEffect(() => {
    isMountedRef.current = true
    
    if (enabled) {
      startPolling()
    }

    return () => {
      isMountedRef.current = false
      stopPolling()
    }
  }, [enabled, startPolling, stopPolling])

  return {
    data,
    loading,
    error,
    retryCount,
    refetch,
    startPolling,
    stopPolling
  }
}