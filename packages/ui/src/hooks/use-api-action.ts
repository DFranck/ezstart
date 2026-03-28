'use client';
import { useState } from 'react';
import { toast } from 'sonner';

// Inline ApiError type and validator (was from @ezstart/types)
type ApiError = { error: string; [key: string]: any };

function isApiError<T>(data: T | ApiError): data is ApiError {
  return typeof data === 'object' && !!data && 'error' in data;
}

export function useApiAction() {
  const [error, setError] = useState<string | null>(null);

  async function exec<T>(
    fn: () => Promise<{ status: number; data: any }>
  ): Promise<T | null> {
    setError(null);
    const result = await fn();
    const { status, data } = result;

    if (status >= 200 && status < 300 && !isApiError(data)) {
      return data as T;
    }

    let errorMsg = 'Unknown error';
    if (isApiError(data)) {
      if (Array.isArray(data.details) && data.details[0]?.message) {
        errorMsg = data.details[0].message;
      } else {
        errorMsg = data.error;
      }
    }
    setError(errorMsg);
    toast.error(errorMsg);
    return null;
  }

  return { exec, error, setError };
}
