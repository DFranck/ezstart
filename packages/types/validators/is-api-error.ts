import { ApiError } from '../api/errors';

export function isApiError<T>(data: T | ApiError): data is ApiError {
  return typeof data === 'object' && !!data && 'error' in data;
}
