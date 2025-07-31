import { ApiError } from '../api';

export function isApiError<T>(data: T | ApiError): data is ApiError {
  return typeof data === 'object' && !!data && 'error' in data;
}
