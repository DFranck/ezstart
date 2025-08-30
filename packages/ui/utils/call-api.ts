import { getApiUrl } from './get-api-url'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type ApiError = { error: string; [key: string]: any }

export type ApiResponse<T> =
  | { ok: true; status: number; url: string; data: T }
  | { ok: false; status: number; url: string; data: ApiError | null }

export type CallApiOptions = {
  method?: HttpMethod
  query?: Record<string, any>
  body?: any
  headers?: Record<string, string>
  signal?: AbortSignal
}

export async function callApi<T = any>(
  endpoint: string,
  options: CallApiOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', query, body, headers = {}, signal } = options

  let url = `${getApiUrl()}${endpoint}`
  if (query && Object.keys(query).length > 0) {
    const q = new URLSearchParams(query).toString()
    url += url.includes('?') ? `&${q}` : `?${q}`
  }

  const isFormUrlEncoded = body instanceof URLSearchParams
  const isStringBody = typeof body === 'string'
  const isJsonBody = !isFormUrlEncoded && !isStringBody

  // Get userId from localStorage for authentication header
  let userId: string | null = null
  if (typeof window !== 'undefined') {
    try {
      const userStore = localStorage.getItem('ez-billing-user')
      if (userStore) {
        const parsed = JSON.parse(userStore)
        userId = parsed.state?.user?._id || null
      }
    } catch {
      userId = null
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...headers,
      },
      body: isFormUrlEncoded ? body : isStringBody ? body : body ? JSON.stringify(body) : undefined,
      signal,
    })

    let data: T | ApiError | null = null
    try {
      data = await res.json()
    } catch {
      data = null
    }

    if (res.ok) {
      return {
        ok: true as const,
        status: res.status,
        url: res.url,
        data: data as T,
      }
    } else {
      if (!res.ok) {
        console.warn('[callApi] API returned !ok')
        console.warn('[callApi] Method:', method)
        console.warn('[callApi] URL:', url)
        console.warn('[callApi] Status:', res.status)
        console.warn('[callApi] Body:', body)
        console.warn('[callApi] Headers:', headers)
        console.warn('[callApi] Query:', query)
        console.warn('[callApi] Response:', data)
      }
      return {
        ok: false as const,
        status: res.status,
        url: res.url,
        data: data as ApiError | null,
      }
    }
  } catch (err) {
    console.error('[callApi] Fetch failed:', err)
    console.error('[callApi] Endpoint:', endpoint)
    console.error('[callApi] Body:', body)
    console.error('[callApi] Query:', query)

    return {
      status: 0,
      ok: false,
      url,
      data: { error: 'Fetch failed', reason: (err as Error).message },
    }
  }
}
