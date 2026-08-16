import { describe, it, expect, vi } from 'vitest'
import { getServerPlans } from '../../server/get-server-plans.js'
import type { Plan } from '../../core/types.js'

const planA: Plan = {
  id: 'plan_a',
  name: 'Pro',
  amount: 1900,
  currency: 'EUR',
  interval: 'month',
  intervalCount: 1,
  features: ['Feature 1'],
  description: 'Pro plan',
  active: true,
  sortOrder: 1,
  appName: 'ezauth',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const planB: Plan = {
  ...planA,
  id: 'plan_b',
  name: 'Free',
  amount: 0,
  sortOrder: 0,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getServerPlans', () => {
  it('returns plans from `{ success: true, data }` envelope (sorted by sortOrder)', async () => {
    // planA.sortOrder=1, planB.sortOrder=0 → expect planB first after sort.
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [planA, planB] }))
    const plans = await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(plans).toEqual([planB, planA])
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://api.example.com/api/plans?applicationId=app_1'),
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns plans from raw array payload', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([planA]))
    const plans = await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(plans).toEqual([planA])
  })

  it('returns plans from `{ plans: [...] }` legacy key', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ plans: [planA] }))
    const plans = await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(plans).toEqual([planA])
  })

  it('maps MongoDB `_id` → `id`', async () => {
    const raw = { ...planA, id: undefined, _id: 'mongo_id_1' }
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [raw] }))
    const plans = await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(plans?.[0]?.id).toBe('mongo_id_1')
  })

  it('forwards appName when applicationId is absent', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    await getServerPlans({
      apiUrl: 'https://api.example.com',
      appName: 'ezbill',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('appName=ezbill'),
      expect.any(Object)
    )
  })

  it('forwards publishableKey as ?key= for test/live scoping', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      publishableKey: 'ez_pk_test_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('key=ez_pk_test_abc'),
      expect.any(Object)
    )
  })

  it('forwards the Cookie header when provided', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Cookie: 'session=abc' }) })
    )
  })

  it('returns empty array (not null) on `{ success: true, data: [] }`', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    const plans = await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(plans).toEqual([])
  })

  it('returns null on non-2xx (e.g. 500)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: false }, 500))
    const plans = await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(plans).toBeNull()
  })

  it('returns null on `success: false` envelope', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: false, error: 'forbidden', data: [planA] })
    )
    const plans = await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(plans).toBeNull()
  })

  it('returns null and logs warn on network error (never throws)', async () => {
    const warn = vi.fn()
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const plans = await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: { warn },
    })
    expect(plans).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('returns null when the body is not JSON', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('<html>oops</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
    )
    const plans = await getServerPlans({
      apiUrl: 'https://api.example.com',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(plans).toBeNull()
  })

  it('handles trailing slash in apiUrl', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    await getServerPlans({
      apiUrl: 'https://api.example.com/',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://api.example.com/api/plans?'),
      expect.any(Object)
    )
  })
})
