import { ApiError, ApiResponse, CallApiOptions } from '@ezstart/types';
import { getApiUrl } from './get-api-url';

export async function callApi<T = any>(
  endpoint: string,
  options: CallApiOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', query, body, headers = {}, signal } = options;

  let url = `${getApiUrl()}${endpoint}`;

  if (query && Object.keys(query).length > 0) {
    const q = new URLSearchParams(query).toString();
    url += url.includes('?') ? `&${q}` : `?${q}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  let data: T | ApiError | null = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  return {
    status: res.status,
    ok: res.ok,
    url: res.url,
    data,
  };
}
