/**
 * Tests for `computeConnectFee` — pure Connect fee math.
 *
 * Pure function = pure tests: no mocks, no I/O, no fixtures. Just inputs ->
 * expected outputs.
 */
import { describe, expect, it } from 'vitest'
import { computeConnectFee } from '../../server/connect-fee.js'

describe('computeConnectFee', () => {
  it('computes 5% of $10.00 as 50 cents (canonical Starter plan)', () => {
    const result = computeConnectFee({ baseAmountCents: 1000, feePercent: 5 })
    expect(result).toEqual({
      applicationFeeAmount: 50,
      applicationFeePercent: 5,
    })
  })

  it('rounds half-up to nearest cent (Math.round semantics)', () => {
    // 333 cents * 5% = 16.65 → rounds to 17
    const result = computeConnectFee({ baseAmountCents: 333, feePercent: 5 })
    expect(result.applicationFeeAmount).toBe(17)
  })

  it('returns zero fees when baseAmountCents is 0', () => {
    const result = computeConnectFee({ baseAmountCents: 0, feePercent: 5 })
    expect(result).toEqual({
      applicationFeeAmount: 0,
      applicationFeePercent: 5,
    })
  })

  it('returns zero applicationFeeAmount when feePercent is 0', () => {
    const result = computeConnectFee({ baseAmountCents: 1000, feePercent: 0 })
    expect(result).toEqual({
      applicationFeeAmount: 0,
      applicationFeePercent: 0,
    })
  })

  it('clamps negative baseAmountCents to 0 (defensive)', () => {
    const result = computeConnectFee({ baseAmountCents: -500, feePercent: 5 })
    expect(result).toEqual({
      applicationFeeAmount: 0,
      applicationFeePercent: 5,
    })
  })

  it('clamps negative feePercent to 0 (defensive)', () => {
    const result = computeConnectFee({ baseAmountCents: 1000, feePercent: -1 })
    expect(result).toEqual({
      applicationFeeAmount: 0,
      applicationFeePercent: 0,
    })
  })

  it('clamps feePercent > 100 to 100 (defensive)', () => {
    const result = computeConnectFee({ baseAmountCents: 1000, feePercent: 150 })
    expect(result).toEqual({
      applicationFeeAmount: 1000,
      applicationFeePercent: 100,
    })
  })

  it('handles fractional fee percentages (e.g. 1.5% Enterprise plan)', () => {
    // 10000 cents * 1.5% = 150
    const result = computeConnectFee({ baseAmountCents: 10000, feePercent: 1.5 })
    expect(result).toEqual({
      applicationFeeAmount: 150,
      applicationFeePercent: 1.5,
    })
  })

  it('is pure — same input always returns same output (no hidden state)', () => {
    const a = computeConnectFee({ baseAmountCents: 12345, feePercent: 3 })
    const b = computeConnectFee({ baseAmountCents: 12345, feePercent: 3 })
    expect(a).toEqual(b)
  })
})
