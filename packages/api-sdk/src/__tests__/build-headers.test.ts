import { describe, expect, it } from 'vitest'
import { buildHeaders } from '../core/internal/request.js'

/**
 * Covers MED-5 (case-insensitive header dedup) and MED-6 (default Accept
 * derivation when `json: true`) from the Wave C audit, plus regression
 * coverage on the pre-existing precedence rules.
 */
describe('buildHeaders', () => {
  describe('MED-5 — case-insensitive header dedup', () => {
    it('does not inject Accept when caller already passed `accept` (lowercase)', () => {
      const result = buildHeaders({ accept: 'text/plain' }, null, { accept: 'application/json' })
      expect(result).toEqual({ accept: 'text/plain' })
      expect(result['Accept']).toBeUndefined()
    })

    it('does not inject Content-Type when caller already passed `CONTENT-TYPE` (uppercase)', () => {
      const result = buildHeaders({ 'CONTENT-TYPE': 'application/xml' }, null, { json: true })
      expect(result['Content-Type']).toBeUndefined()
      expect(result['CONTENT-TYPE']).toBe('application/xml')
    })

    it('does not overwrite caller-supplied Authorization (lowercase) with token from store', () => {
      const result = buildHeaders({ authorization: 'Bearer caller-token' }, 'token-from-store', {})
      expect(result).toEqual({ authorization: 'Bearer caller-token' })
      expect(result['Authorization']).toBeUndefined()
    })

    it('does not overwrite caller-supplied Authorization (canonical case) with token from store', () => {
      const result = buildHeaders({ Authorization: 'Basic dXNlcjpwYXNz' }, 'token-from-store', {})
      expect(result).toEqual({ Authorization: 'Basic dXNlcjpwYXNz' })
    })
  })

  describe('MED-6 — default Accept when json body', () => {
    it('defaults Accept to application/json when json:true and no accept option', () => {
      const result = buildHeaders({}, 'tok', { json: true })
      expect(result).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok',
      })
    })

    it('uses explicit accept option over the json default', () => {
      const result = buildHeaders({}, null, { json: true, accept: 'text/event-stream' })
      expect(result['Accept']).toBe('text/event-stream')
      expect(result['Content-Type']).toBe('application/json')
    })

    it('does not inject Accept when neither accept nor json is provided', () => {
      const result = buildHeaders({}, null, {})
      expect(result['Accept']).toBeUndefined()
      expect(result['Content-Type']).toBeUndefined()
    })

    it('caller-supplied accept (any case) shadows the json default', () => {
      const result = buildHeaders({ ACCEPT: 'text/plain' }, null, { json: true })
      expect(result['Accept']).toBeUndefined()
      expect(result['ACCEPT']).toBe('text/plain')
    })
  })

  describe('regression — pre-existing behavior preserved', () => {
    it('honors explicit accept option when caller passed no Accept header', () => {
      const result = buildHeaders({}, null, { accept: 'text/plain' })
      expect(result).toEqual({ Accept: 'text/plain' })
    })

    it('passes through extra headers untouched when no options are set', () => {
      const result = buildHeaders({ 'X-Trace-Id': 'abc' }, null, {})
      expect(result).toEqual({ 'X-Trace-Id': 'abc' })
    })

    it('attaches Bearer token when caller did not provide an Authorization header', () => {
      const result = buildHeaders({ 'X-Trace-Id': 'abc' }, 'tok', {})
      expect(result).toEqual({ 'X-Trace-Id': 'abc', Authorization: 'Bearer tok' })
    })

    it('does not inject Authorization when token is null', () => {
      const result = buildHeaders({}, null, {})
      expect(result['Authorization']).toBeUndefined()
    })

    it('returns a new object (does not mutate the extra headers map)', () => {
      const extra = { 'X-Trace-Id': 'abc' }
      const result = buildHeaders(extra, 'tok', { json: true })
      expect(result).not.toBe(extra)
      expect(extra).toEqual({ 'X-Trace-Id': 'abc' })
    })
  })
})
