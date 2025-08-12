'use client'

import { Button, Icon } from '@ezstart/ui/components'
import { ErrorState } from '../hooks/useErrorHandler'
import { useEffect, useState } from 'react'

interface Props {
  errors: ErrorState[]
  onClearError: (timestamp: number) => void
  onClearAll: () => void
}

export function ErrorDisplay({ errors, onClearError, onClearAll }: Props) {
  const [visibleErrors, setVisibleErrors] = useState<ErrorState[]>([])

  useEffect(() => {
    setVisibleErrors(errors)
  }, [errors])

  if (errors.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {visibleErrors.map((error) => (
        <div
          key={error.timestamp}
          className={`p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 ${
            error.retryable
              ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
              : 'bg-red-50 border-red-400 text-red-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <Icon
                name={error.retryable ? 'fa:FaExclamationTriangle' : 'fa:FaTimesCircle'}
                className={`mt-0.5 ${
                  error.retryable ? 'text-yellow-500' : 'text-red-500'
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{error.message}</p>
                {error.code && (
                  <p className="text-xs opacity-75 mt-1">Code: {error.code}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClearError(error.timestamp)}
              className="ml-2 text-gray-500 hover:text-gray-700"
            >
              <Icon name="fa:FaTimes" className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}
      
      {errors.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="text-xs"
          >
            Clear all errors
          </Button>
        </div>
      )}
    </div>
  )
}