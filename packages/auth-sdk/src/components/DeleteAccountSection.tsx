'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  Icon,
  Input,
  Label,
  P,
} from '@ezstart/ui/components'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../react/hooks.js'
import { useAuthContext, useAuthStoreApi } from '../react/auth-provider.js'

/**
 * Safe localStorage key removal — Safari private mode + SSR + agent harness
 * environments all fail differently when localStorage is unavailable. Wrap
 * the call so a missing storage layer never throws past the logout flow.
 *
 * @internal
 */
function safeRemoveLocalStorage(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Storage disabled / quota exceeded / private mode — non-fatal, the store
    // reset above is the source of truth.
  }
}

/**
 * User-facing strings for {@link DeleteAccountSection}. All keys are required
 * — the consumer provides translations via `next-intl` (or any i18n library)
 * and passes them down. The SDK ships English defaults so a partial override
 * is enough for non-localized integrations.
 */
export interface DeleteAccountSectionTexts {
  /** Card title — e.g. "Delete account" */
  title: string
  /** Card body text. */
  description: string
  /** Trigger button label. */
  triggerLabel: string
  /** Confirmation dialog title. */
  confirmTitle: string
  /** Confirmation dialog body. Should mention the grace period. */
  confirmDescription: string
  /** Label of the email confirmation input. */
  emailLabel: string
  /** Placeholder for the email confirmation input. */
  emailPlaceholder: string
  /** Label of the optional password input. */
  passwordLabel: string
  /** Placeholder for the password input. */
  passwordPlaceholder: string
  /** Cancel button label inside the dialog. */
  cancel: string
  /** Final destructive button label inside the dialog. */
  confirm: string
  /** Toast shown on success. */
  successMessage: string
  /** Toast prefix shown on failure (the API message is appended). */
  errorMessage: string
}

/** Default English copy. */
export const DEFAULT_DELETE_ACCOUNT_TEXTS: DeleteAccountSectionTexts = {
  title: 'Delete account',
  description:
    'Permanently delete your account and all associated data. This action cannot be undone.',
  triggerLabel: 'Delete my account',
  confirmTitle: 'Are you absolutely sure?',
  confirmDescription:
    'This will schedule your account for deletion in 30 days. You can cancel during this period by signing in again.',
  emailLabel: 'Type your email to confirm',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password (required)',
  passwordPlaceholder: 'Your account password',
  cancel: 'Cancel',
  confirm: 'Delete my account',
  successMessage: 'Your account has been scheduled for deletion.',
  errorMessage: 'Failed to delete account',
}

export interface DeleteAccountSectionProps {
  /**
   * Override any subset of the default English texts. Required for any
   * non-English consumer — pass translated strings from `useTranslations()`.
   */
  texts?: Partial<DeleteAccountSectionTexts>
  /**
   * Optional className applied to the outer Card wrapper.
   */
  className?: string
  /**
   * Called after a successful soft-deletion. Defaults to running the full
   * 8-step SDK logout flow (cf. `standard-sdk-dx.md` §11ter) and redirecting
   * to `redirectAfterDelete`. Pass a custom callback to change the
   * post-deletion UX (e.g. localized redirect, custom analytics).
   */
  onDeleted?: (result: { scheduledDeletionAt: string }) => void | Promise<void>
  /**
   * Hard-redirect URL applied after the local logout flow completes. Defaults
   * to `'/?accountDeleted=true'`. Use `window.location.assign()` semantics —
   * the page is fully reloaded so any in-memory React state is dropped along
   * with the now-revoked session.
   */
  redirectAfterDelete?: string
  /**
   * localStorage key used by the per-Provider Zustand store. MUST match the
   * `storageKey` passed to `<AuthProvider>` (defaults to `'ezauth-storage'`).
   * Surfaced here so the explicit `removeItem` step of the logout flow
   * doesn't drift when consumers customise the persist key.
   */
  storageKey?: string
  /**
   * Optional consumer hook fired right after the local store is cleared.
   * Use this to drop React Query / SWR caches, close WebSockets, or notify
   * other in-page state holders of the logout (cf. `standard-sdk-dx.md` §11ter
   * step 5). The promise is awaited before the hard-redirect step so async
   * cleanup completes first.
   */
  onLogout?: () => void | Promise<void>
}

/**
 * "Danger zone" card that lets the authenticated user schedule their account
 * for soft-deletion. Renders a destructive {@link AlertDialog} that requires
 * the user to retype their email and (when applicable) their password before
 * the request is sent.
 *
 * On success the component calls `client.logout()` and redirects to
 * `/?accountDeleted=true` so a public landing can show a confirmation
 * banner. Override that flow with the `onDeleted` callback.
 *
 * @example
 * ```tsx
 * <DeleteAccountSection
 *   texts={{
 *     title: t('deleteAccount.title'),
 *     description: t('deleteAccount.description'),
 *     // ...
 *   }}
 * />
 * ```
 */
export function DeleteAccountSection({
  texts: textOverrides,
  className,
  onDeleted,
  redirectAfterDelete = '/?accountDeleted=true',
  storageKey = 'ezauth-storage',
  onLogout,
}: DeleteAccountSectionProps) {
  const texts: DeleteAccountSectionTexts = { ...DEFAULT_DELETE_ACCOUNT_TEXTS, ...textOverrides }
  const { user, accessToken } = useAuth()
  const { client } = useAuthContext()
  const storeApi = useAuthStoreApi()

  const [open, setOpen] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!user) return null

  const requiresPassword = user.hasSetOwnPassword !== false
  const emailMatches = emailValue.trim().toLowerCase() === user.email.toLowerCase()
  const canSubmit = emailMatches && (!requiresPassword || passwordValue.length > 0) && !submitting

  const handleConfirm = async (): Promise<void> => {
    if (!canSubmit) return
    setSubmitting(true)
    // Mirror the global isLoggingOut flag too — UserMenu and other consumer
    // CTAs that subscribe to it will switch to a loading state while the
    // delete + redirect chain runs (cf. standard-sdk-dx.md §11ter step 8).
    storeApi.getState().setLoggingOut(true)
    try {
      const result = await client.deleteAccount(
        {
          confirmation: emailValue,
          ...(requiresPassword ? { password: passwordValue } : {}),
        },
        accessToken || undefined
      )

      // Reset dialog UI immediately so the screen doesn't flash an open
      // modal during the hard redirect.
      setOpen(false)
      setEmailValue('')
      setPasswordValue('')

      if (onDeleted) {
        // Custom flow takes over — consumer is responsible for tearing down
        // the auth state. We still leave isLoggingOut=true so the consumer
        // can rely on it; they can reset() the store themselves if needed.
        await onDeleted({ scheduledDeletionAt: result.scheduledDeletionAt })
        return
      }

      // ── Default flow: full 8-step SDK logout (standard-sdk-dx.md §11ter) ──
      //
      // Step 1: server already revoked refresh tokens + cleared cookies
      //         inside the DELETE handler — DO NOT call /logout again
      //         (it would 401 against the soft-deleted account and write
      //         a noisy audit log entry).
      //
      // Step 2: reset the per-Provider Zustand store. This wraps a
      //         BroadcastChannel.postMessage({type:'LOGOUT'}) call as well
      //         (see store.ts), satisfying step 4 in the same swing.
      storeApi.getState().logout()

      // Step 3: explicit localStorage cleanup. The persist middleware
      //         normally rewrites the key with the new (logged-out) state,
      //         but a hard wipe is sturdier — it removes any stale field
      //         the persist `partialize` selector might have skipped.
      safeRemoveLocalStorage(storageKey)

      // Step 4: cross-tab broadcast — handled by the wrapped logout()
      //         action inside the store (see step 2).

      // Step 5: consumer hook — drop React Query cache, close WebSockets,
      //         etc. Awaited so async cleanup finishes before redirect.
      try {
        await onLogout?.()
      } catch {
        // Consumer cleanup must never block the redirect.
      }

      // Step 6: toast confirmation.
      toast.success(texts.successMessage)

      // Step 7: hard redirect via location.assign — drops every in-memory
      //         React state along with the now-revoked session. router.push
      //         would keep React state mounted and risk surfacing stale
      //         "logged-in" UI for one render.
      if (typeof window !== 'undefined') {
        window.location.assign(redirectAfterDelete)
      }
    } catch (error) {
      // Restore the logging-out flag on failure so the UI doesn't stay
      // stuck in "signing out" forever.
      storeApi.getState().setLoggingOut(false)
      const message = error instanceof Error ? error.message : texts.errorMessage
      toast.error(`${texts.errorMessage}: ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className={className} variant="default">
      <CardHeader>
        <Div className="flex items-center gap-2">
          <Icon name="lucide:TriangleAlert" className="h-5 w-5 text-destructive" />
          <H3 className="text-base font-semibold text-destructive">{texts.title}</H3>
        </Div>
      </CardHeader>
      <CardContent>
        <Div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <P className="text-sm text-muted-foreground">{texts.description}</P>
          <Button
            variant="destructive"
            size="sm"
            className="cursor-pointer shrink-0"
            onClick={() => setOpen(true)}
          >
            <Icon name="lucide:Trash2" className="mr-1.5 h-4 w-4" />
            {texts.triggerLabel}
          </Button>
        </Div>
      </CardContent>

      <AlertDialog
        variant="destructive"
        open={open}
        onOpenChange={next => {
          if (submitting) return
          setOpen(next)
          if (!next) {
            setEmailValue('')
            setPasswordValue('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{texts.confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>

          <Div className="space-y-3">
            <Div className="space-y-1">
              <Label htmlFor="ezstart-delete-account-email" className="text-xs">
                {texts.emailLabel}
              </Label>
              <Input
                id="ezstart-delete-account-email"
                type="email"
                autoComplete="off"
                value={emailValue}
                placeholder={texts.emailPlaceholder}
                onChange={e => setEmailValue(e.target.value)}
              />
            </Div>

            {requiresPassword && (
              <Div className="space-y-1">
                <Label htmlFor="ezstart-delete-account-password" className="text-xs">
                  {texts.passwordLabel}
                </Label>
                <Input
                  id="ezstart-delete-account-password"
                  type="password"
                  autoComplete="current-password"
                  value={passwordValue}
                  placeholder={texts.passwordPlaceholder}
                  onChange={e => setPasswordValue(e.target.value)}
                />
              </Div>
            )}
          </Div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>{texts.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canSubmit}
              onClick={event => {
                // Prevent Radix from auto-closing the dialog before the request
                // resolves; we close it ourselves on success in `handleConfirm`.
                event.preventDefault()
                void handleConfirm()
              }}
            >
              {submitting ? (
                <>
                  <Icon name="lucide:Loader2" className="mr-1.5 h-4 w-4 animate-spin" />
                  {texts.confirm}
                </>
              ) : (
                texts.confirm
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
