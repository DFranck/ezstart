/**
 * Tests for @ezstart/pay-sdk Zustand store factory.
 *
 * The store is created per-`<PayProvider>` via `createPayStore()` (factory +
 * React Context) — the legacy module-level `usePayStore` singleton was removed
 * (standard.md §0bis: module-level stores break Next.js SSR). These tests
 * exercise the vanilla store API returned by the factory directly.
 */
import { describe, it, expect } from 'vitest'
import { createPayStore } from '../../react/store.js'
import { makePayment } from '../helpers.js'

describe('createPayStore', () => {
  it('has correct default initial state when no options are provided', () => {
    const store = createPayStore()
    const state = store.getState()
    expect(state.payments).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.applicationId).toBeNull()
    expect(state.appSlug).toBeNull()
    expect(state.isReady).toBe(false)
    expect(state.applicationResolutionStatus).toBe('idle')
  })

  it('boots with the SSR-resolved application context (initial option)', () => {
    const store = createPayStore({
      initial: {
        applicationId: 'app_ssr',
        appSlug: 'ezbill',
        isReady: true,
        applicationResolutionStatus: 'ready',
      },
    })
    const state = store.getState()
    expect(state.applicationId).toBe('app_ssr')
    expect(state.appSlug).toBe('ezbill')
    expect(state.isReady).toBe(true)
    expect(state.applicationResolutionStatus).toBe('ready')
  })

  it('setPayments replaces the payments array', () => {
    const store = createPayStore()
    const payments = [makePayment({ id: '1' }), makePayment({ id: '2' })]
    store.getState().setPayments(payments)

    expect(store.getState().payments).toHaveLength(2)
    expect(store.getState().payments[0]?.id).toBe('1')
  })

  it('addPayment prepends to the array', () => {
    const store = createPayStore()
    store.getState().setPayments([makePayment({ id: 'old' })])
    store.getState().addPayment(makePayment({ id: 'new' }))

    const { payments } = store.getState()
    expect(payments).toHaveLength(2)
    expect(payments[0]?.id).toBe('new')
    expect(payments[1]?.id).toBe('old')
  })

  it('setLoading toggles loading state', () => {
    const store = createPayStore()
    store.getState().setLoading(true)
    expect(store.getState().isLoading).toBe(true)

    store.getState().setLoading(false)
    expect(store.getState().isLoading).toBe(false)
  })

  it('setError / clearError manages error state', () => {
    const store = createPayStore()
    store.getState().setError('Something went wrong')
    expect(store.getState().error).toBe('Something went wrong')

    store.getState().clearError()
    expect(store.getState().error).toBeNull()
  })

  it('setApplicationContext patches the resolution lifecycle slice', () => {
    const store = createPayStore()
    store.getState().setApplicationContext({
      applicationId: 'app_resolved',
      appSlug: 'ezpay',
      isReady: true,
      applicationResolutionStatus: 'ready',
    })

    const state = store.getState()
    expect(state.applicationId).toBe('app_resolved')
    expect(state.appSlug).toBe('ezpay')
    expect(state.isReady).toBe(true)
    expect(state.applicationResolutionStatus).toBe('ready')
  })

  it('multiple stores created via the factory are fully isolated', () => {
    const a = createPayStore()
    const b = createPayStore()

    a.getState().setPayments([makePayment({ id: 'only-a' })])

    expect(a.getState().payments).toHaveLength(1)
    expect(b.getState().payments).toHaveLength(0)
  })
})
