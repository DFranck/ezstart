import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  StatusPage,
  deriveGlobalStatus,
  defaultStatusPageTexts,
  type StatusServiceResult,
} from '../../../components/feedback/status-page'

// ---------------------------------------------------------------------------
// Pure status derivation
// ---------------------------------------------------------------------------

describe('deriveGlobalStatus', () => {
  function makeResult(state: StatusServiceResult['state']): StatusServiceResult {
    return {
      service: { name: 'X', url: 'http://x' },
      state,
      responseTimeMs: state === 'down' ? null : 42,
      statusCode: state === 'down' ? null : 200,
      checkedAt: new Date(),
      error: null,
    }
  }

  it('returns "checking" when results array is empty', () => {
    expect(deriveGlobalStatus([])).toBe('checking')
  })

  it('returns "checking" when at least one result is still checking', () => {
    expect(deriveGlobalStatus([makeResult('operational'), makeResult('checking')])).toBe('checking')
  })

  it('returns "operational" when every result is operational', () => {
    expect(deriveGlobalStatus([makeResult('operational'), makeResult('operational')])).toBe(
      'operational'
    )
  })

  it('returns "degraded" when at least one is degraded but not all are down', () => {
    expect(deriveGlobalStatus([makeResult('operational'), makeResult('degraded')])).toBe('degraded')
  })

  it('returns "degraded" when at least one is down but others are operational', () => {
    expect(deriveGlobalStatus([makeResult('operational'), makeResult('down')])).toBe('degraded')
  })

  it('returns "down" when every result is down', () => {
    expect(deriveGlobalStatus([makeResult('down'), makeResult('down')])).toBe('down')
  })
})

// ---------------------------------------------------------------------------
// Component rendering + fetch lifecycle
// ---------------------------------------------------------------------------

describe('StatusPage', () => {
  const services = [
    { name: 'EZAuth API', url: 'https://example.test/ezauth/health' },
    { name: 'EZPay API', url: 'https://example.test/ezpay/health' },
  ]

  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('renders the title and intro from default texts when no override is given', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    await act(async () => {
      render(<StatusPage services={services} refreshIntervalMs={0} />)
    })

    expect(screen.getByText(defaultStatusPageTexts.title)).toBeInTheDocument()
    expect(screen.getByText(defaultStatusPageTexts.intro)).toBeInTheDocument()
  })

  it('shows operational badge when every service returns 2xx', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    await act(async () => {
      render(<StatusPage services={services} refreshIntervalMs={0} />)
    })

    await waitFor(() => {
      expect(screen.getByText(defaultStatusPageTexts.summaryOperational)).toBeInTheDocument()
    })

    // Every service line shows the operational state badge
    const operationalBadges = screen.getAllByText(defaultStatusPageTexts.stateOperational)
    expect(operationalBadges.length).toBe(services.length)
  })

  it('shows degraded badge when one service returns non-2xx', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
      .mockResolvedValueOnce(new Response('err', { status: 500 }))

    await act(async () => {
      render(<StatusPage services={services} refreshIntervalMs={0} />)
    })

    await waitFor(() => {
      expect(screen.getByText(defaultStatusPageTexts.summaryDegraded)).toBeInTheDocument()
    })

    expect(screen.getByText(defaultStatusPageTexts.stateOperational)).toBeInTheDocument()
    expect(screen.getByText(defaultStatusPageTexts.stateDegraded)).toBeInTheDocument()
  })

  it('shows down summary when every fetch rejects (network error)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await act(async () => {
      render(<StatusPage services={services} refreshIntervalMs={0} />)
    })

    await waitFor(() => {
      expect(screen.getByText(defaultStatusPageTexts.summaryDown)).toBeInTheDocument()
    })

    const downBadges = screen.getAllByText(defaultStatusPageTexts.stateDown)
    expect(downBadges.length).toBe(services.length)
  })

  it('respects the texts override (title + summaryOperational)', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    await act(async () => {
      render(
        <StatusPage
          services={services}
          refreshIntervalMs={0}
          texts={{
            title: 'Statut plateforme',
            summaryOperational: 'Tout fonctionne',
          }}
        />
      )
    })

    expect(screen.getByText('Statut plateforme')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Tout fonctionne')).toBeInTheDocument()
    })
  })

  it('renders the refreshHint text as-is (caller interpolates)', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    await act(async () => {
      render(
        <StatusPage
          services={services}
          refreshIntervalMs={15_000}
          texts={{ refreshHint: 'Auto-refreshes every 15s' }}
        />
      )
    })

    expect(screen.getByText('Auto-refreshes every 15s')).toBeInTheDocument()
  })

  it('renders the default refreshHint when none is overridden', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    await act(async () => {
      render(<StatusPage services={services} refreshIntervalMs={60_000} />)
    })

    // Default text is plain string — the component does not interpolate the
    // refreshIntervalMs into it. Callers wire `{ seconds }` themselves.
    expect(screen.getByText('Auto-refreshes every 30s')).toBeInTheDocument()
  })

  it('hides the refresh hint when refreshIntervalMs is 0', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    await act(async () => {
      render(<StatusPage services={services} refreshIntervalMs={0} />)
    })

    expect(screen.queryByText(/Auto-refreshes/)).not.toBeInTheDocument()
  })

  it('uses cache: "no-store" and method GET for every health check', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    await act(async () => {
      render(<StatusPage services={services} refreshIntervalMs={0} />)
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(services.length)
    })
    for (const call of fetchMock.mock.calls) {
      const [url, init] = call
      expect(typeof url).toBe('string')
      expect(init).toMatchObject({ method: 'GET', cache: 'no-store' })
    }
  })
})

// ---------------------------------------------------------------------------
// Deep mode (mode: 'deep' + deepUrl)
// ---------------------------------------------------------------------------

describe('StatusPage — deep mode', () => {
  const deepServices = [
    {
      name: 'EZPay API',
      url: 'https://example.test/ezpay/health',
      deepUrl: 'https://example.test/ezpay/health/deep',
      mode: 'deep' as const,
    },
  ]

  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the deepUrl when mode is deep', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          checks: {
            db: { status: 'ok', durationMs: 12 },
            stripe: { status: 'ok', durationMs: 80 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await act(async () => {
      render(<StatusPage services={deepServices} refreshIntervalMs={0} />)
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.test/ezpay/health/deep',
        expect.any(Object)
      )
    })
  })

  it('renders the dependency list with status badges', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          checks: {
            db: { status: 'ok', durationMs: 12 },
            stripe: { status: 'degraded', durationMs: 2200, message: 'Slow' },
            resend: { status: 'ok', durationMs: 40 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await act(async () => {
      render(
        <StatusPage
          services={deepServices}
          refreshIntervalMs={0}
          texts={{
            dependenciesLabel: 'Dependencies',
            checkStatusOk: 'OK',
            checkStatusDegraded: 'Slow',
            checkStatusDown: 'Down',
          }}
        />
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Dependencies')).toBeInTheDocument()
    })
    expect(screen.getByText('db')).toBeInTheDocument()
    expect(screen.getByText('stripe')).toBeInTheDocument()
    expect(screen.getByText('resend')).toBeInTheDocument()
    // Slow appears twice — once as the global Degraded label (capital from
    // default), once as our overridden checkStatusDegraded. Both badges.
    const slowBadges = screen.getAllByText('Slow')
    expect(slowBadges.length).toBeGreaterThanOrEqual(1)
    // Durations rendered
    expect(screen.getByText('12ms')).toBeInTheDocument()
    expect(screen.getByText('2200ms')).toBeInTheDocument()
  })

  it('flips service state to degraded when a check is degraded', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'degraded',
          checks: {
            db: { status: 'ok', durationMs: 12 },
            stripe: { status: 'degraded', durationMs: 2200 },
          },
        }),
        { status: 200 }
      )
    )

    await act(async () => {
      render(<StatusPage services={deepServices} refreshIntervalMs={0} />)
    })

    await waitFor(() => {
      expect(screen.getByText(defaultStatusPageTexts.summaryDegraded)).toBeInTheDocument()
    })
  })

  it('flips service state to down when any check is down (api returns 503)', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'down',
          checks: {
            db: { status: 'down', message: 'Connection refused' },
          },
        }),
        { status: 503 }
      )
    )

    await act(async () => {
      render(<StatusPage services={deepServices} refreshIntervalMs={0} />)
    })

    await waitFor(() => {
      expect(screen.getByText(defaultStatusPageTexts.summaryDown)).toBeInTheDocument()
    })
  })

  it('falls back to shallow probe when mode=deep but deepUrl is missing', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    const servicesWithoutDeepUrl = [
      {
        name: 'EZPay API',
        url: 'https://example.test/ezpay/health',
        mode: 'deep' as const,
        // intentionally no deepUrl
      },
    ]

    await act(async () => {
      render(<StatusPage services={servicesWithoutDeepUrl} refreshIntervalMs={0} />)
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.test/ezpay/health',
        expect.any(Object)
      )
    })
  })
})
