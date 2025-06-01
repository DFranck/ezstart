type ApiError = { error: string; [key: string]: any };

export function isApiError<T>(data: T | ApiError): data is ApiError {
  return typeof data === 'object' && !!data && 'error' in data;
}
