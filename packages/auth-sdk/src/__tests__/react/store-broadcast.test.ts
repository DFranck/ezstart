/**
 * Cross-tab BroadcastChannel hardening (HAC-HIGH-1, 2026-05-17).
 *
 * Threat model: an attacker (malicious browser extension, XSS payload on
 * a sibling app sharing the root origin) can call
 * `new BroadcastChannel('ezauth-sync').postMessage({ type: 'LOGIN',
 * user: { roles: ['superadmin'] } })` and trick every open tab into
 * adopting the spoofed user as their current identity → cross-tab
 * privilege escalation.
 *
 * Defense: the receive-side never trusts the payload. `LOGIN` /
 * `TOKEN_REFRESH` / `USER_UPDATED` are signals only — the store
 * re-fetches the authoritative user from the server via `fetchMe()`.
 * Only the server's response shapes the store. `LOGOUT` is the lone
 * exception: it can only DENY service, never escalate.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { createAuthStore, isBroadcastMessage, type BroadcastMessage } from '../../react/store.js'
import { createTestUser } from '../helpers.js'

// ---------------------------------------------------------------------------
// Cross-instance MockBroadcastChannel — routes messages between every
// channel sharing the same name (and never echoes to the sender, matching
// the real spec). The global mock in `setup.ts` is a stub that drops
// every message; we need a real bus to drive the hardening tests.
// ---------------------------------------------------------------------------

type Listener = (event: { data: unknown }) => void

const buses = new Map<string, Set<{ listener: Listener | null }>>()

class TestBroadcastChannel {
  name: string
  private slot: { listener: Listener | null } = { listener: null }
  private closed = false

  constructor(name: string) {
    this.name = name
    if (!buses.has(name)) buses.set(name, new Set())
    buses.get(name)!.add(this.slot)
  }

  set onmessage(fn: Listener | null) {
    this.slot.listener = fn
  }

  get onmessage(): Listener | null {
    return this.slot.listener
  }

  postMessage(data: unknown): void {
    if (this.closed) throw new Error('InvalidStateError')
    const bus = buses.get(this.name)
    if (!bus) return
    for (const peer of bus) {
      if (peer === this.slot) continue // never echo to sender
      peer.listener?.({ data })
    }
  }

  close(): void {
    this.closed = true
    const bus = buses.get(this.name)
    bus?.delete(this.slot)
    this.slot.listener = null
  }
}

beforeEach(() => {
  buses.clear()
  localStorage.clear()
  // Swap the global stub for the cross-instance routing mock for the
  // duration of these tests. Other suites keep the noop mock from setup.ts.
  globalThis.BroadcastChannel = TestBroadcastChannel as unknown as typeof BroadcastChannel
})

// ---------------------------------------------------------------------------
// isBroadcastMessage type guard
// ---------------------------------------------------------------------------

describe('isBroadcastMessage', () => {
  it('accepts known signal envelopes', () => {
    expect(isBroadcastMessage({ type: 'LOGIN' })).toBe(true)
    expect(isBroadcastMessage({ type: 'LOGOUT' })).toBe(true)
    expect(isBroadcastMessage({ type: 'TOKEN_REFRESH' })).toBe(true)
    expect(isBroadcastMessage({ type: 'USER_UPDATED' })).toBe(true)
  })

  it('rejects unknown / spoofed / malformed payloads', () => {
    expect(isBroadcastMessage(null)).toBe(false)
    expect(isBroadcastMessage(undefined)).toBe(false)
    expect(isBroadcastMessage('LOGIN')).toBe(false)
    expect(isBroadcastMessage(42)).toBe(false)
    expect(isBroadcastMessage([])).toBe(false)
    expect(isBroadcastMessage({})).toBe(false)
    expect(isBroadcastMessage({ type: 'INJECT_USER' })).toBe(false)
    expect(isBroadcastMessage({ type: 123 })).toBe(false)
    // Extra fields are tolerated — only `type` is gating. The store
    // ignores everything else regardless.
    expect(isBroadcastMessage({ type: 'LOGIN', user: { roles: ['evil'] } })).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// HAC-HIGH-1 — receive-side never trusts the broadcast payload
// ---------------------------------------------------------------------------

describe('BroadcastChannel hardening (HAC-HIGH-1)', () => {
  const channelName = 'hac-high-1-test'

  it('IGNORES a spoofed LOGIN payload — server returns existing user, no privilege elevation', async () => {
    const legitUser = createTestUser({ _id: 'legit-1', email: 'legit@app.com', roles: ['user'] })
    const fetchMe = vi.fn(async () => legitUser)

    // Receiver tab: bootstrap as the legit user. Provide fetchMe so the
    // broadcast handler can re-fetch from the server when triggered.
    const receiver = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 0,
      initialUser: legitUser,
    })

    // Attacker tab: opens a raw channel and forges a LOGIN with elevated roles.
    const evilChannel = new BroadcastChannel(channelName)
    evilChannel.postMessage({
      type: 'LOGIN',
      user: { _id: 'evil', email: 'attacker@evil.com', roles: ['superadmin'] },
      accessToken: 'forged-token-from-attacker',
      refreshToken: 'forged-rt',
      mode: 'localStorage',
    })

    // Yield to the microtask queue so the async re-fetch resolves.
    await new Promise(resolve => setTimeout(resolve, 0))

    // The store re-fetched from the server (legitUser) — NOT the spoofed payload.
    expect(fetchMe).toHaveBeenCalledTimes(1)
    const state = receiver.getState()
    expect(state.user?._id).toBe('legit-1')
    expect(state.user?.roles).toEqual(['user'])
    expect(state.accessToken).not.toBe('forged-token-from-attacker')

    evilChannel.close()
    receiver.__cleanup()
  })

  it('LEGITIMATE LOGIN signal — peer tab re-fetches and adopts the server user', async () => {
    const serverUser = createTestUser({ _id: 'srv-1', email: 'server@app.com' })
    const fetchMeReceiver = vi.fn(async () => serverUser)
    const fetchMeEmitter = vi.fn(async () => serverUser)

    const receiver = createAuthStore({
      broadcastChannel: channelName,
      fetchMe: fetchMeReceiver,
      refetchDebounceMs: 0,
    })
    const emitter = createAuthStore({
      broadcastChannel: channelName,
      fetchMe: fetchMeEmitter,
      refetchDebounceMs: 0,
    })

    // Emitter tab logs in → broadcasts a signal-only LOGIN envelope.
    act(() => {
      emitter.getState().setAuth(serverUser, 'at', 'localStorage', 'rt')
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    // Receiver re-fetched and adopted the server user.
    expect(fetchMeReceiver).toHaveBeenCalledTimes(1)
    expect(receiver.getState().user?._id).toBe('srv-1')
    expect(receiver.getState().isAuthenticated).toBe(true)

    emitter.__cleanup()
    receiver.__cleanup()
  })

  it('LOGOUT signal — peer tab resets immediately without a server round-trip', async () => {
    const legitUser = createTestUser()
    const fetchMe = vi.fn(async () => legitUser)

    const receiver = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 0,
      initialUser: legitUser,
    })
    const emitter = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 0,
    })

    // Sanity: receiver starts authenticated.
    expect(receiver.getState().isAuthenticated).toBe(true)

    act(() => {
      emitter.getState().logout()
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(receiver.getState().isAuthenticated).toBe(false)
    expect(receiver.getState().user).toBeNull()
    // LOGOUT must NOT trigger a server re-fetch — server already revoked
    // the session on the emitter side; an extra /me call would just 401.
    expect(fetchMe).not.toHaveBeenCalled()

    emitter.__cleanup()
    receiver.__cleanup()
  })

  it('UNKNOWN message type — silently ignored, no store mutation, no fetchMe', async () => {
    const legitUser = createTestUser({ _id: 'untouched' })
    const fetchMe = vi.fn(async () => legitUser)

    const receiver = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 0,
      initialUser: legitUser,
    })

    const evilChannel = new BroadcastChannel(channelName)
    evilChannel.postMessage({ type: 'INJECT_USER', user: { roles: ['superadmin'] } })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMe).not.toHaveBeenCalled()
    expect(receiver.getState().user?._id).toBe('untouched')

    evilChannel.close()
    receiver.__cleanup()
  })

  it('non-object / null payloads — ignored without crashing', async () => {
    const legitUser = createTestUser()
    const fetchMe = vi.fn(async () => legitUser)

    const receiver = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 0,
      initialUser: legitUser,
    })

    const evilChannel = new BroadcastChannel(channelName)
    expect(() => evilChannel.postMessage('EVIL_STRING')).not.toThrow()
    expect(() => evilChannel.postMessage(null)).not.toThrow()
    expect(() => evilChannel.postMessage(42)).not.toThrow()
    expect(() => evilChannel.postMessage([])).not.toThrow()

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMe).not.toHaveBeenCalled()
    expect(receiver.getState().isAuthenticated).toBe(true)

    evilChannel.close()
    receiver.__cleanup()
  })

  it('debounce — bursts of LOGIN signals coalesce to a single re-fetch', async () => {
    const legitUser = createTestUser()
    const fetchMe = vi.fn(async () => legitUser)

    const receiver = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 1000,
    })

    const attacker = new BroadcastChannel(channelName)
    for (let i = 0; i < 10; i++) {
      attacker.postMessage({ type: 'LOGIN' })
    }

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(fetchMe).toHaveBeenCalledTimes(1)

    attacker.close()
    receiver.__cleanup()
  })

  it('TOKEN_REFRESH signal — peer tab re-fetches authoritative user', async () => {
    const refreshedUser = createTestUser({ _id: 'refreshed', email: 'r@app.com' })
    const fetchMe = vi.fn(async () => refreshedUser)

    const receiver = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 0,
    })

    const peer = new BroadcastChannel(channelName)
    peer.postMessage({ type: 'TOKEN_REFRESH' })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMe).toHaveBeenCalledTimes(1)
    expect(receiver.getState().user?._id).toBe('refreshed')

    peer.close()
    receiver.__cleanup()
  })

  it('fetchMe returns null (server says no session) → store treated as logout', async () => {
    const legitUser = createTestUser()
    const fetchMe = vi.fn(async () => null)

    const receiver = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 0,
      initialUser: legitUser,
    })

    expect(receiver.getState().isAuthenticated).toBe(true)

    const peer = new BroadcastChannel(channelName)
    peer.postMessage({ type: 'LOGIN' })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMe).toHaveBeenCalledTimes(1)
    expect(receiver.getState().isAuthenticated).toBe(false)
    expect(receiver.getState().user).toBeNull()

    peer.close()
    receiver.__cleanup()
  })

  it('fetchMe throws → store preserves current local state (no spurious logout)', async () => {
    const legitUser = createTestUser({ _id: 'preserved' })
    const fetchMe = vi.fn(async () => {
      throw new Error('network blip')
    })

    const receiver = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 0,
      initialUser: legitUser,
    })

    const peer = new BroadcastChannel(channelName)
    peer.postMessage({ type: 'LOGIN' })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMe).toHaveBeenCalledTimes(1)
    // User stays — transient errors must not log the user out.
    expect(receiver.getState().user?._id).toBe('preserved')
    expect(receiver.getState().isAuthenticated).toBe(true)

    peer.close()
    receiver.__cleanup()
  })

  it('emitted broadcast carries SIGNAL ONLY — no user / accessToken / refreshToken on the wire', async () => {
    const fetchMe = vi.fn(async () => createTestUser())
    const emitter = createAuthStore({
      broadcastChannel: channelName,
      fetchMe,
      refetchDebounceMs: 0,
    })

    // Sniffer tab — captures everything that flies on the bus.
    const sniffer = new BroadcastChannel(channelName)
    const captured: unknown[] = []
    sniffer.onmessage = ev => {
      captured.push(ev.data)
    }

    const sensitiveUser = createTestUser({
      _id: 'sensitive',
      email: 'sensitive@app.com',
      roles: ['superadmin'],
    })
    act(() => {
      emitter
        .getState()
        .setAuth(sensitiveUser, 'super-secret-token', 'localStorage', 'super-secret-rt')
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(captured).toHaveLength(1)
    const message = captured[0] as BroadcastMessage & Record<string, unknown>
    expect(message.type).toBe('LOGIN')
    // No payload — peers MUST re-fetch from the server.
    expect(message).not.toHaveProperty('user')
    expect(message).not.toHaveProperty('accessToken')
    expect(message).not.toHaveProperty('refreshToken')
    expect(message).not.toHaveProperty('mode')

    sniffer.close()
    emitter.__cleanup()
  })
})
