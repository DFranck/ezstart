'use client'

/**
 * WebhookSecretSection — reveal-once UX for the per-Application HMAC secret.
 *
 * Renders inside the "Webhooks" tab of `<ApplicationDetailView>`. Behavior:
 *
 * - Default state: shows a masked stub (`whsec_••••<last4>`) — the SDK never
 *   has the full value because `GET /applications/:id` deliberately omits it
 *   (Mongoose `select: false`). The user is told this in the help text.
 * - "Regenerate secret" button opens an `<AlertDialog>` confirmation. On
 *   confirm, fires `useRegenerateWebhookSecret(id).mutate()`.
 * - On success, the response carries a fresh `whsec_<hex>` which is held in
 *   local component state ONLY for the lifetime of the reveal. A bright
 *   warning banner shows the value with a Copy button + Hide button.
 *   Refreshing the page or navigating away wipes the state — there is no
 *   second chance to read the value.
 *
 * The `<Application>` shape coming from the cached `useApplication(id)` query
 * is used solely to derive the display stub (slug + last 4 of the previous
 * value when present from a prior in-session reveal). The credential is not
 * persisted in React Query state.
 *
 * @module @ezstart/auth-sdk/components/applications/WebhookSecretSection
 */

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
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  H4,
  Input,
  Label,
  P,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useState } from 'react'
import type { Application } from '../../core/types.js'
import { useRegenerateWebhookSecret } from '../../react/applications.js'
import type { ApplicationDetailViewTexts } from './types.js'

export interface WebhookSecretSectionProps {
  /** The Application whose webhook secret is being managed. */
  application: Application
  /**
   * Detail-view texts (subset; this component reads only the
   * `webhook*` keys). Allows the consumer to drive i18n via the parent
   * texts prop without splitting the dictionary.
   */
  texts: ApplicationDetailViewTexts
}

/**
 * Mask a webhook secret for display: keep the `whsec_` prefix + the last 4
 * chars, replace the middle with bullets. When no secret has been revealed
 * in this session, fall back to a generic stub.
 */
function maskSecret(secret: string | null): string {
  if (!secret) return 'whsec_••••••••••••••'
  if (secret.length <= 12) return 'whsec_••••••••••••••'
  return `${secret.slice(0, 7)}••••••••${secret.slice(-4)}`
}

export function WebhookSecretSection({ application, texts }: WebhookSecretSectionProps) {
  // Held in component state ONLY between rotation success and the user
  // clicking Hide. Never persisted to localStorage or React Query cache.
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const rotateMutation = useRegenerateWebhookSecret({
    onSuccess: app => {
      setConfirmOpen(false)
      // The server returns the new secret exactly once — capture it for the
      // reveal-once banner.
      if (app.webhookSecret) {
        setRevealedSecret(app.webhookSecret)
      }
      toast.success(texts.webhookRegenerateSuccess)
    },
    onError: () => {
      setConfirmOpen(false)
      toast.error(texts.webhookRegenerateFailed)
    },
  })

  const handleCopy = async () => {
    if (!revealedSecret) return
    try {
      await navigator.clipboard.writeText(revealedSecret)
      toast.success(texts.webhookCopySuccess)
    } catch {
      toast.error(texts.webhookRegenerateFailed)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{texts.webhookTitle}</CardTitle>
        <CardDescription>{texts.webhookDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {revealedSecret ? (
          <Div
            role="alert"
            className="space-y-3 rounded-md border border-warning/40 bg-warning/10 p-4"
          >
            <H4 size="h4" className="text-warning-foreground">
              {texts.webhookRevealTitle}
            </H4>
            <P className="text-sm text-foreground">{texts.webhookRevealHelp}</P>
            <Div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                readOnly
                value={revealedSecret}
                className="font-mono text-xs"
                onFocus={e => e.target.select()}
                aria-label={texts.webhookSecretLabel}
              />
              <Div className="flex gap-2">
                <Button onClick={handleCopy} size="sm" variant="default">
                  {texts.webhookCopy}
                </Button>
                <Button onClick={() => setRevealedSecret(null)} size="sm" variant="outline">
                  {texts.webhookHide}
                </Button>
              </Div>
            </Div>
          </Div>
        ) : (
          <Div className="space-y-2">
            <Label>{texts.webhookSecretLabel}</Label>
            <Input
              readOnly
              value={maskSecret(null)}
              className="font-mono text-xs text-muted-foreground"
              aria-label={texts.webhookSecretLabel}
            />
            <P className="text-xs text-muted-foreground">{texts.webhookSecretMaskedHelp}</P>
          </Div>
        )}

        <Div className="space-y-2">
          <Label htmlFor="detail-webhook-endpoint">{texts.webhookEndpointLabel}</Label>
          <Input
            id="detail-webhook-endpoint"
            readOnly
            value={application.webhookEndpointUrl ?? ''}
            placeholder={texts.webhookEndpointEmpty}
            className="text-xs"
          />
          <P className="text-xs text-muted-foreground">{texts.webhookEndpointHelp}</P>
        </Div>

        <Div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={rotateMutation.isPending}
          >
            {rotateMutation.isPending ? texts.webhookRegenerating : texts.webhookRegenerate}
          </Button>
        </Div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.webhookConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{texts.webhookConfirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotateMutation.isPending}>
              {texts.webhookConfirmCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rotateMutation.mutate(application.id)}
              disabled={rotateMutation.isPending}
            >
              {texts.webhookConfirmSubmit}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
