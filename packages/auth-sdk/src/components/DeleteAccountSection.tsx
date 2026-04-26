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
import { useAuthContext } from '../react/auth-provider.js'
import { useAuthStore } from '../react/store.js'

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
   * Called after a successful soft-deletion. Defaults to logging out and
   * redirecting to `/?accountDeleted=true`. Pass a custom callback to
   * change the post-deletion UX (e.g. localized redirect).
   */
  onDeleted?: (result: { scheduledDeletionAt: string }) => void | Promise<void>
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
}: DeleteAccountSectionProps) {
  const texts: DeleteAccountSectionTexts = { ...DEFAULT_DELETE_ACCOUNT_TEXTS, ...textOverrides }
  const { user, accessToken } = useAuth()
  const { client } = useAuthContext()
  const store = useAuthStore()

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
    try {
      const result = await client.deleteAccount(
        {
          confirmation: emailValue,
          ...(requiresPassword ? { password: passwordValue } : {}),
        },
        accessToken || undefined
      )
      toast.success(texts.successMessage)

      // Reset state and close dialog before navigating away.
      setOpen(false)
      setEmailValue('')
      setPasswordValue('')

      if (onDeleted) {
        await onDeleted({ scheduledDeletionAt: result.scheduledDeletionAt })
        return
      }

      // Default UX: clear local session and bounce to a public landing.
      try {
        await client.logout()
      } catch {
        // Logout failures are non-blocking — local store is cleared regardless.
      }
      store.logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/?accountDeleted=true'
      }
    } catch (error) {
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
