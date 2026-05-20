/**
 * `<AuthProvider>` prop types + logout-text defaults.
 *
 * Extracted from `auth-provider.tsx` (Wave D Lot 4). `AuthProviderProps` is
 * re-exported from `auth-provider.tsx` so the public barrel import path
 * (`@ezstart/auth-sdk` → `./auth-provider.js`) is unchanged. The JSDoc is
 * preserved verbatim — these are the consumer-facing prop docs.
 *
 * @module @ezstart/auth-sdk/react/auth-provider/props
 */

import type { ReactNode } from 'react'
import type { AuthMode, AuthUser } from '../../core/types.js'
import type { IdleWarningTexts } from '../idle-warning-toast.js'
import type { AuthLogger } from './logger.js'

export interface AuthProviderProps {
  children: ReactNode

  // ── Clerk-like API (preferred) ──────────────────────────────────────────

  /**
   * Publishable key (e.g., `ez_pk_live_...` for production, `ez_pk_test_...` for sandbox).
   * If not provided, reads from `process.env.NEXT_PUBLIC_EZAUTH_KEY`.
   * Legacy `ezk_*` keys still accepted but deprecated (rotate by 2026-07-21).
   */
  publishableKey?: string

  /**
   * Provider mode:
   * - `'standard'` (default) — uses publishableKey or dev defaults
   * - `'first-party'` — for ezauth web itself, no key needed
   */
  mode?: 'standard' | 'first-party'

  // ── Manual overrides ────────────────────────────────────────────────────

  /** Override app name (auto-resolved from key in standard mode). */
  appName?: string
  /** Override API URL. */
  apiUrl?: string
  /** Override web URL (for login/register redirects). */
  webUrl?: string
  /** Override auth mode. Auto-detected if not set. */
  authMode?: AuthMode
  /** JWT public key (required for jwt mode). */
  jwtPublicKey?: string

  // ── Optional ────────────────────────────────────────────────────────────

  /** Optional logger instance. */
  logger?: AuthLogger

  /**
   * Optional initial user state — typically resolved server-side via
   * `getServerAuth()` from `@ezstart/auth-sdk/server`.
   *
   * When provided, the per-Provider Zustand store boots with
   * `{ user: initialUser, isAuthenticated: true, isAuthReady: true }`
   * **synchronously**, before any subscriber renders. This eliminates
   * the `<LoginButton>` flash that would otherwise occur in `httpOnly`
   * mode while the async `/me` request resolves.
   *
   * Pass `null` (or omit) to fall back to the legacy client-side bootstrap.
   */
  initialUser?: AuthUser | null

  /** Override the localStorage key used by the persist middleware. */
  storageKey?: string

  // ── Logout flow defaults (cf. standard-sdk-dx.md §11ter) ───────────────
  //
  // These default values feed every `useAuth().logout()` call and any SDK
  // component that drives the logout (UserMenu, UserMenuV2, DeleteAccountSection).
  // Per-call overrides remain possible — pass an options bag to `logout()`
  // or to the component's own `onLogout` / `redirectAfterLogout` props.

  /**
   * Where to navigate after a successful logout. Defaults to `'/'`.
   * Pass `false` to disable the hard-redirect entirely (the consumer takes
   * over navigation, e.g. router.push to a localized landing).
   *
   * The redirect uses `window.location.assign()` (a hard navigation) so
   * every in-memory React state is dropped along with the now-revoked
   * session — `router.push()` would keep React state mounted and risk
   * surfacing stale "logged-in" UI for one render cycle.
   */
  redirectAfterLogout?: string | false

  /**
   * Consumer hook fired between the local store reset (step 4) and the
   * toast / redirect (steps 6-7). Use it to drop React Query cache, close
   * WebSockets, IndexedDB cleanup, etc.
   *
   * The promise is awaited so async cleanup completes before the redirect.
   * Throws are swallowed — consumer cleanup must never block the logout
   * orchestration.
   *
   * @example
   * ```tsx
   * <AuthProvider onLogout={() => queryClient.clear()}>
   * ```
   */
  onLogout?: () => void | Promise<void>

  /**
   * Default texts for the success / error toasts emitted at step 6 of the
   * logout flow. The hook's `logout({ texts })` option overrides per-call.
   * Defaults to English. For locale-aware defaults pass
   * `getAuthTexts(locale, 'userMenu')`.
   */
  logoutTexts?: Partial<{
    /** Toast shown after a successful logout. */
    signOutSuccess: string
    /** Toast shown when local cleanup fails. Server errors are silent. */
    signOutError: string
  }>

  // ── Idle timeout (auto-logout on inactivity) ───────────────────────────
  //
  // Opt-in. When `idleTimeoutMs` is a positive number, the provider mounts
  // an `<IdleTimeoutManager>` child that watches DOM activity events and
  // auto-fires `useAuth().logout()` after the configured period. A warning
  // toast surfaces `idleWarningMs` before the auto-logout (default 60s)
  // with a "Stay signed in" CTA that resets the timer.
  //
  // Set to `null` / `undefined` (default) to disable.
  //
  // Recommended consumer values:
  // - `15 * 60 * 1000` (15 minutes — security-focused dashboards)
  // - `30 * 60 * 1000` (30 minutes — lax / consumer apps)

  /**
   * Auto-logout window in milliseconds. Pass `null` to disable (default).
   * Only fires while the user is authenticated.
   */
  idleTimeoutMs?: number | null
  /**
   * How long before the auto-logout the warning toast surfaces.
   * Defaults to `60_000` (60 seconds).
   */
  idleWarningMs?: number
  /**
   * Override the watched DOM activity events. Defaults to mouse, keyboard,
   * touch, scroll and focus.
   */
  idleEvents?: readonly string[]
  /**
   * Localized labels for the idle warning + signed-out toast. Falls back
   * to {@link defaultIdleWarningTexts} (English).
   */
  idleWarningTexts?: IdleWarningTexts

  // ── Deprecated props (backward compat) ────────────────────────────────

  /** @deprecated Use `authMode` instead. */
  useHttpOnlyCookies?: boolean
}

/** English fallback texts for the logout success / error toasts. */
export const DEFAULT_LOGOUT_TEXTS = {
  signOutSuccess: 'You have been signed out',
  signOutError: 'Failed to sign out — please try again',
} as const
