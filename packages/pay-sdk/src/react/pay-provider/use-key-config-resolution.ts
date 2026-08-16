/**
 * Application-context resolution hook for `<PayProvider>`.
 *
 * Owns the full `GET /api/keys/config` resolution lifecycle that maps a
 * publishable key to its `applicationId` / `appSlug` (+ optional ezpay
 * `webUrl`). Extracted verbatim from `pay-provider.tsx` so the provider stays
 * a thin orchestrator (standard.md §3 — file < 400 lines). Behaviour is
 * unchanged — pure code move, no logic edits.
 *
 * Critical invariants preserved here (do NOT regress):
 * - **REG-1**: one `/keys/config` call per mounted provider + key pair. The
 *   `resolvedKeyRef` dedup guard is NEVER reset in any cleanup — resetting it
 *   re-arms the fetch on the next re-render (StrictMode double-mount or a
 *   parent re-render that recreates `client`), producing the infinite re-fetch
 *   loop that, combined with a transient 429, locks the user out via rate
 *   limit.
 * - **StrictMode safety**: the in-flight result is gated by `stillActive()`
 *   (mount + key match) instead of a per-effect `cancelled` flag, so a
 *   mount→cleanup→mount cycle never strands the status at `pending`.
 * - **VULN-1 (no fail-open)**: on resolve error, applicationId stays `null`
 *   and status becomes `'failed'` so downstream hooks refuse cross-app queries.
 *
 * @module @ezstart/pay-sdk/react/pay-provider/use-key-config-resolution
 */
'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { Logger } from '@ezstart/logger'
import type { PayClient } from '../../core/pay-client.js'
import type { ApplicationResolutionStatus, PayState } from '../store.js'

/**
 * Inputs the provider hands to {@link useKeyConfigResolution}. All values are
 * derived synchronously from `<PayProvider>` props (so the initial slice is
 * SSR-correct on the very first render).
 */
export interface KeyConfigResolutionInput {
  /** The configured pay client (memoized in the provider). */
  client: PayClient
  /** Legacy app-slug prop (used to seed `appSlug` when no resolve runs). */
  appName: string | undefined
  /** EZPay publishable key (`ez_pk_*`) — triggers the `/keys/config` resolve. */
  publishableKey: string | undefined
  /** Explicit `applicationId` prop (short-circuits the resolve). */
  applicationIdProp: string | undefined
  /** `config.applicationId` fallback (short-circuits the resolve). */
  configApplicationId: string | undefined
  /** Synchronously-resolved explicit applicationId (prop ?? config). */
  explicitApplicationId: string | null
  /** Synchronously-resolved initial lifecycle status. */
  initialStatus: ApplicationResolutionStatus
  /** Synchronously-resolved initial appSlug (parity with legacy behaviour). */
  initialAppSlug: string | null
  /** Per-Provider store action that syncs the resolved context into zustand. */
  setApplicationContext: PayState['setApplicationContext']
  /** Latest diagnostic logger (kept in a ref by the provider for stability). */
  logRef: MutableRefObject<Logger>
}

/**
 * Resolved application context surfaced back to the provider for the React
 * context value. `resolvedWebUrlFromKey` carries the `webUrl` returned by
 * `/keys/config` (used to build "Get your key" CTAs without manual env wiring).
 */
export interface KeyConfigResolutionResult {
  applicationId: string | null
  appSlug: string | null
  resolutionStatus: ApplicationResolutionStatus
  resolvedWebUrlFromKey: string | null
}

export function useKeyConfigResolution({
  client,
  appName,
  publishableKey,
  applicationIdProp,
  configApplicationId,
  explicitApplicationId,
  initialStatus,
  initialAppSlug,
  setApplicationContext,
  logRef,
}: KeyConfigResolutionInput): KeyConfigResolutionResult {
  const [applicationId, setApplicationId] = useState<string | null>(explicitApplicationId)
  const [appSlug, setAppSlug] = useState<string | null>(initialAppSlug)
  const [resolutionStatus, setResolutionStatus] =
    useState<ApplicationResolutionStatus>(initialStatus)
  // Auto-resolved EZPay web URL (from `/keys/config.webUrl`). When the consumer
  // didn't pass `payWebUrl` explicitly AND the publishable key resolve returns
  // a `webUrl`, we surface it via the React context so fallback CTAs ("Get
  // your key") render with the right host even in production. Without this,
  // consumers must set `NEXT_PUBLIC_EZPAY_WEB_URL` manually for every app.
  const [resolvedWebUrlFromKey, setResolvedWebUrlFromKey] = useState<string | null>(null)

  /**
   * REG-1 guard — tracks which `publishableKey` has already been resolved (or
   * attempted) by this provider instance. Ensures a single `/keys/config` call
   * per mounted provider + key pair, even if a stale effect fires because
   * React / dev tools / Strict Mode re-run it, or an ancestor re-renders with
   * a new closure (e.g. an inline `config` object recreating the memoized
   * `client` on every render).
   *
   * The ref is **never reset in the effect cleanup**: doing so re-arms the
   * fetch on the very next re-render (StrictMode mount→cleanup→mount, or a
   * parent re-render with a fresh `client`), which is exactly the infinite
   * re-fetch loop REG-1 prevents. A transient 429 (or any fetch error)
   * combined with such a loop would hammer the auth API at > 30 req/min and
   * lock the user out via rate limit. The key is only re-fetched when the
   * `publishableKey` value itself changes (a different key → a different ref
   * value → a legitimate new fetch).
   */
  const resolvedKeyRef = useRef<string | null>(null)

  /**
   * Tracks whether the provider is still mounted so the async `/keys/config`
   * resolve can avoid a "setState after unmount" warning. Unlike the
   * `resolvedKeyRef` dedup guard, this is reset by the cleanup of a dedicated
   * mount/unmount effect (empty deps) — so a StrictMode mount→cleanup→mount
   * cycle does NOT keep the fetch from applying its result on the live mount
   * (the second mount re-arms `isMountedRef = true` before the in-flight fetch
   * settles). The result is applied as long as the key still matches, never
   * discarded by a transient effect re-run.
   */
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Resolve applicationId from publishableKey if provided and not already set.
  useEffect(() => {
    // If explicit applicationId is provided, no need to fetch.
    if (applicationIdProp || configApplicationId) {
      const id = applicationIdProp ?? configApplicationId ?? null
      setApplicationId(id)
      setAppSlug(appName ?? null)
      setResolutionStatus('ready')
      setApplicationContext({
        applicationId: id,
        appSlug: appName ?? null,
        isReady: true,
        applicationResolutionStatus: 'ready',
      })
      return
    }

    // No publishableKey → legacy `appName`-only (idle). Cross-app possible.
    if (!publishableKey) {
      setAppSlug(appName ?? null)
      setResolutionStatus('idle')
      setApplicationContext({
        applicationId: null,
        appSlug: appName ?? null,
        isReady: true,
        applicationResolutionStatus: 'idle',
      })
      return
    }

    // REG-1: if we've already attempted to resolve this publishableKey, do NOT
    // re-fetch. Even when the previous attempt failed (e.g. 429 rate limit), a
    // loop of re-attempts would make the situation worse. The consumer must
    // remount the provider (or reload the page) to retry — this is the same
    // contract already documented in the `.catch` log message below.
    if (resolvedKeyRef.current === publishableKey) {
      return
    }
    resolvedKeyRef.current = publishableKey
    const resolvingKey = publishableKey

    // publishableKey provided → mark pending and fetch.
    setResolutionStatus('pending')
    setApplicationContext({
      applicationId: null,
      appSlug: null,
      isReady: false,
      applicationResolutionStatus: 'pending',
    })

    // The result is applied iff the provider is still mounted AND the key we
    // resolved is still the active one. We deliberately do NOT use a per-effect
    // `cancelled` closure: a StrictMode mount→cleanup→mount cycle would cancel
    // the only in-flight fetch (the second mount is blocked by `resolvedKeyRef`
    // and starts none of its own), leaving the status stuck at `pending`.
    const stillActive = () => isMountedRef.current && resolvedKeyRef.current === resolvingKey

    client
      .resolveApplicationByKey(publishableKey)
      .then(cfg => {
        if (!stillActive()) return
        setApplicationId(cfg.applicationId)
        setAppSlug(cfg.appSlug)
        // Capture the API-returned EZPay web URL so the context can surface it
        // when the consumer didn't pass `payWebUrl`. Skipped when the value is
        // empty — falls back to localhost auto-detect / null.
        if (cfg.webUrl && cfg.webUrl.length > 0) {
          setResolvedWebUrlFromKey(cfg.webUrl)
        }
        setResolutionStatus('ready')
        setApplicationContext({
          applicationId: cfg.applicationId,
          appSlug: cfg.appSlug,
          isReady: true,
          applicationResolutionStatus: 'ready',
        })
      })
      .catch((err: unknown) => {
        if (!stillActive()) return
        const message = err instanceof Error ? err.message : String(err)
        // VULN-1: NO fail-open. Keep applicationId=null AND isReady=false so
        // downstream hooks (usePaymentHistory, etc.) can detect the failure
        // and refuse to run a cross-app query.
        logRef.current.error(
          `[pay-sdk] Failed to resolve application from publishableKey: ${message}. ` +
            `Scoped queries will be blocked (applicationResolutionStatus='failed'). ` +
            `Retry by refreshing the page or re-mounting the PayProvider.`
        )
        setApplicationId(null)
        setAppSlug(null)
        setResolutionStatus('failed')
        setApplicationContext({
          applicationId: null,
          appSlug: null,
          isReady: false,
          applicationResolutionStatus: 'failed',
        })
      })

    // No cleanup that resets `resolvedKeyRef` — see the ref's doc comment.
    // Resetting it would re-arm the fetch on the next re-render (StrictMode
    // double-mount or a parent re-render that recreates `client`), producing
    // the REG-1 infinite re-fetch loop. The in-flight result is gated by
    // `stillActive()` (mount + key match) instead of a per-effect flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we intentionally resolve once per (client, publishableKey) pair
  }, [client, publishableKey, applicationIdProp, configApplicationId])

  return { applicationId, appSlug, resolutionStatus, resolvedWebUrlFromKey }
}
