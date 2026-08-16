'use client'

import type { StoreApi } from 'zustand'
import type { AuthUser } from '../../core/types.js'
import type { AuthState } from './state.js'

/** Minimum interval (ms) between two server re-fetches triggered by a broadcast. */
export const REFETCH_DEBOUNCE_MS = 1000

/**
 * Cross-tab broadcast message envelope. **Signal-only** by design — no
 * user/token payload is ever trusted from the wire (threat-model
 * HAC-HIGH-1, audited 2026-05-17): a malicious extension, an XSS payload
 * on a sibling app sharing the same root origin, or any other process
 * that can call `postMessage` on the BroadcastChannel must NOT be able
 * to inject `{ type: 'LOGIN', user: { roles: ['superadmin'] } }` and
 * elevate the privileges of every open tab.
 *
 * The receive-side treats `LOGIN` / `TOKEN_REFRESH` / `USER_UPDATED` as
 * a "hey, something changed — go check with the server" hint, then
 * re-fetches the authoritative user via the provided `fetchMe` callback
 * (typically `() => client.getCurrentUser()` which hits `/api/auth/me`).
 * The server remains the single source of truth — an attacker who can
 * spoof a broadcast still can't make the server lie.
 */
export type BroadcastMessage =
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESH' }
  | { type: 'USER_UPDATED' }

/**
 * Type guard — accept only the known signal envelopes. Anything else
 * (unknown `type`, non-object payload, `null`, strings, arrays…) is
 * dropped silently. Forward-compatibility: a newer SDK version emitting
 * a future message type will be ignored by an older receiver instead of
 * crashing.
 */
export function isBroadcastMessage(data: unknown): data is BroadcastMessage {
  if (!data || typeof data !== 'object') return false
  const type = (data as { type?: unknown }).type
  return (
    type === 'LOGIN' || type === 'LOGOUT' || type === 'TOKEN_REFRESH' || type === 'USER_UPDATED'
  )
}

/** Options for {@link attachCrossTabSync}. */
export interface CrossTabSyncOptions {
  /** BroadcastChannel name, or `false` to disable. */
  broadcastChannel: string | false
  /** Authoritative server re-fetch callback. */
  fetchMe?: () => Promise<AuthUser | null>
  /** Debounce window (ms) between consecutive server re-fetches. */
  refetchDebounceMs: number
}

/**
 * Attach cross-tab / cross-app synchronization to a freshly-created auth
 * store. Joins a window-global {@link BroadcastChannel} so multiple Provider
 * instances (ezauth web + ezpay web on the same origin tree) all stay in sync
 * — even though each Provider owns its own store. Tests opt out via
 * `{ broadcastChannel: false }` so isolated React trees don't leak state.
 *
 * SECURITY (HAC-HIGH-1, 2026-05-17): the receive-side NEVER trusts the
 * broadcast payload. `LOGIN` / `TOKEN_REFRESH` / `USER_UPDATED` are signals
 * only — the store re-fetches the authoritative user via `fetchMe()`
 * (typically `/api/auth/me`). An attacker (malicious extension, XSS on a
 * sibling app sharing the root origin) cannot forge
 * `{ type: 'LOGIN', user: { roles: ['superadmin'] } }` and elevate every open
 * tab's privileges, because the server is the single source of truth. See
 * {@link BroadcastMessage}.
 *
 * Mutates the store's `setAuth` / `logout` actions to broadcast SIGNAL-ONLY
 * envelopes after applying the local mutation.
 *
 * @returns A cleanup function that closes the channel, or `null` when the
 *   channel could not be created (SSR, disabled, or unsupported browser).
 */
export function attachCrossTabSync(
  baseStore: StoreApi<AuthState>,
  options: CrossTabSyncOptions
): (() => void) | null {
  const { broadcastChannel, fetchMe, refetchDebounceMs } = options

  if (
    typeof window === 'undefined' ||
    broadcastChannel === false ||
    typeof BroadcastChannel === 'undefined'
  ) {
    return null
  }

  const authChannel = new BroadcastChannel(broadcastChannel)

  // Capture the unwrapped actions BEFORE the wrappers replace them.
  // The broadcast handler MUST use these unwrapped versions when it
  // applies the server-fetched user — calling the wrapped `setAuth`
  // from the receive-side would re-emit a LOGIN broadcast and create
  // an infinite ping-pong between every connected tab.
  const originalSetAuth = baseStore.getState().setAuth
  const originalLogout = baseStore.getState().logout

  // Debounce re-fetches so an attacker spamming broadcast messages
  // cannot DoS the auth API. A single timer is enough — we only ever
  // need to know "the server state may have changed, sync again".
  let lastRefetchAt = 0
  let refetchInFlight = false

  const refetchAndApply = async () => {
    if (!fetchMe) return
    const now = Date.now()
    if (now - lastRefetchAt < refetchDebounceMs) return
    if (refetchInFlight) return
    lastRefetchAt = now
    refetchInFlight = true
    try {
      const user = await fetchMe()
      if (user) {
        // Re-use the store's current mode + tokens — the broadcast does
        // not (and must not) carry credentials. In httpOnly mode the
        // refresh flow happens server-side via the cookie; in
        // localStorage mode the access/refresh tokens already live in
        // this tab's state (a true cross-tab login requires the user
        // to re-login here too — broadcast is a hint, not a token
        // transport).
        //
        // Use the UNWRAPPED `originalSetAuth` — calling the wrapped
        // version would re-broadcast LOGIN to every peer tab and
        // trigger an infinite ping-pong.
        const current = baseStore.getState()
        originalSetAuth(
          user,
          current.accessToken ?? undefined,
          current.mode,
          current.refreshToken ?? undefined
        )
      } else {
        // Server says "no session" → reset state. Use the unwrapped
        // logout for the same reason — we don't want to bounce a
        // LOGOUT signal back to the peer that triggered the re-fetch.
        originalLogout()
      }
    } catch {
      // Best-effort: a transient network blip must never log the user
      // out. Keep the current local state; the next broadcast (or the
      // provider's periodic `verifyToken` tick) will retry.
    } finally {
      refetchInFlight = false
    }
  }

  authChannel.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data
    if (!isBroadcastMessage(data)) {
      // Unknown / spoofed / malformed payloads are silently dropped.
      return
    }
    if (data.type === 'LOGOUT') {
      // LOGOUT is the only signal safe to act on without a server
      // round-trip: a malicious LOGOUT broadcast can only DENY service
      // (the worst it does is log the user out of the current tab),
      // never escalate privileges. The peer tab that emitted LOGOUT
      // has already called POST /api/auth/logout server-side, so any
      // subsequent fetch would 401 anyway.
      //
      // Use the UNWRAPPED `originalLogout` to avoid re-broadcasting
      // LOGOUT to peers (the originator already sent it).
      originalLogout()
      return
    }
    // LOGIN / TOKEN_REFRESH / USER_UPDATED → re-fetch authoritative state.
    void refetchAndApply()
  }

  // Wrap setAuth/logout to broadcast SIGNAL-ONLY envelopes to other
  // tabs/apps. The user/token payload is deliberately omitted from
  // the wire — peer tabs re-fetch from the server (see onmessage
  // above). The postMessage calls are guarded with try/catch because
  // the channel can close out from under us (HMR rebuild, React
  // StrictMode double-mount cleanup, browser navigation tearing down
  // the previous tree). The local store mutation has already happened;
  // failing to broadcast is non-fatal.
  let channelOpen = true

  const safePost = (message: BroadcastMessage) => {
    if (!channelOpen) return
    try {
      authChannel.postMessage(message)
    } catch {
      channelOpen = false
    }
  }

  baseStore.setState({
    setAuth: (user, accessToken, mode, refreshToken) => {
      originalSetAuth(user, accessToken, mode, refreshToken)
      safePost({ type: 'LOGIN' })
    },
    logout: () => {
      originalLogout()
      safePost({ type: 'LOGOUT' })
    },
  })

  return () => {
    channelOpen = false
    authChannel.close()
  }
}
