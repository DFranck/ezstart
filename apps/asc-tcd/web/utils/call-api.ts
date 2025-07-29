import { getApiUrl } from './get-api-url';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type ApiError = { error: string; [key: string]: any };

export async function callApi<T = any>(
  endpoint: string,
  {
    method = 'GET',
    query,
    body,
  }: { method?: HttpMethod; query?: Record<string, any>; body?: any } = {}
): Promise<{ status: number; data: T | ApiError }> {
  let url = `${getApiUrl()}${endpoint}`;
  if (query && Object.keys(query).length > 0) {
    const q = Object.entries(query)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    url += url.includes('?') ? `&${q}` : `?${q}`;
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}
