/**
 * Tests for @ezstart/pay-sdk Zustand store.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { usePayStore } from '../../react/store.js'
import { makePayment } from '../helpers.js'

describe('usePayStore', () => {
  beforeEach(() => {
    // Reset store between tests
    usePayStore.setState({
      payments: [],
      isLoading: false,
      error: null,
    })
  })

  it('has correct initial state', () => {
    const state = usePayStore.getState()
    expect(state.payments).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('setPayments replaces the payments array', () => {
    const payments = [makePayment({ id: '1' }), makePayment({ id: '2' })]
    usePayStore.getState().setPayments(payments)

    expect(usePayStore.getState().payments).toHaveLength(2)
    expect(usePayStore.getState().payments[0]?.id).toBe('1')
  })

  it('addPayment prepends to the array', () => {
    usePayStore.getState().setPayments([makePayment({ id: 'old' })])
    usePayStore.getState().addPayment(makePayment({ id: 'new' }))

    const { payments } = usePayStore.getState()
    expect(payments).toHaveLength(2)
    expect(payments[0]?.id).toBe('new')
    expect(payments[1]?.id).toBe('old')
  })

  it('setLoading toggles loading state', () => {
    usePayStore.getState().setLoading(true)
    expect(usePayStore.getState().isLoading).toBe(true)

    usePayStore.getState().setLoading(false)
    expect(usePayStore.getState().isLoading).toBe(false)
  })

  it('setError / clearError manages error state', () => {
    usePayStore.getState().setError('Something went wrong')
    expect(usePayStore.getState().error).toBe('Something went wrong')

    usePayStore.getState().clearError()
    expect(usePayStore.getState().error).toBeNull()
  })
})
