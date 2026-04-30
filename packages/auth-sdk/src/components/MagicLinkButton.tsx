'use client'

/**
 * MagicLinkButton — drop-in CTA that opens a Modal containing the
 * `<MagicLinkForm>`. Use it as an alternative entry next to the standard
 * password sign-in form (e.g. "or use a magic link" link below the
 * SignIn card).
 *
 * i18n-agnostic: all texts come from the `texts` prop (English defaults).
 */

import { Button, Icon, Modal, P } from '@ezstart/ui/components'
import { useState } from 'react'
import { MagicLinkForm, type MagicLinkFormProps, type MagicLinkFormTexts } from './MagicLinkForm.js'

export interface MagicLinkButtonTexts extends Partial<MagicLinkFormTexts> {
  /** Button label rendered as the trigger. */
  triggerLabel: string
  /** Modal title shown above the form. */
  modalTitle: string
  /** Modal subtitle / description. */
  modalDescription: string
  /** Close button label inside the modal footer. */
  closeButton: string
}

const DEFAULT_BUTTON_TEXTS: MagicLinkButtonTexts = {
  triggerLabel: 'Sign in with a magic link',
  modalTitle: 'Sign in with email',
  modalDescription:
    'Enter your email and we will send you a one-time link to sign in. No password required.',
  closeButton: 'Cancel',
}

export interface MagicLinkButtonProps extends Omit<
  MagicLinkFormProps,
  'texts' | 'formId' | 'hideSubmitButton' | 'onSubmittingChange'
> {
  /** Override texts (English defaults). */
  texts?: Partial<MagicLinkButtonTexts>
  /**
   * Visual variant for the trigger button. Defaults to `outline` so the
   * CTA reads as a secondary action next to the primary password form.
   */
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'secondary'
  /** Trigger button size. */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Trigger button className. */
  className?: string
  /** Show a magic-wand icon next to the label. Defaults to `true`. */
  showIcon?: boolean
}

const FORM_ID = 'ezstart-magic-link-button-form'

export function MagicLinkButton({
  texts,
  variant = 'outline',
  size = 'default',
  className,
  showIcon = true,
  appName,
  redirectUri,
  locale,
  onSuccess,
}: MagicLinkButtonProps) {
  const t: MagicLinkButtonTexts = { ...DEFAULT_BUTTON_TEXTS, ...texts }
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        {showIcon && <Icon name="lucide:Mail" className="h-4 w-4 mr-2" />}
        {t.triggerLabel}
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="default"
        title={t.modalTitle}
        description={t.modalDescription}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {t.closeButton}
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={isSubmitting}
              variant="default"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (t.submittingButton ?? 'Sending…') : (t.submitButton ?? 'Send link')}
            </Button>
          </>
        }
      >
        <MagicLinkForm
          formId={FORM_ID}
          hideSubmitButton
          texts={texts}
          {...(appName ? { appName } : {})}
          {...(redirectUri ? { redirectUri } : {})}
          {...(locale ? { locale } : {})}
          onSubmittingChange={setIsSubmitting}
          onSuccess={email => {
            // Keep the modal open so the user sees the success state in
            // place — the `<MagicLinkForm>` switches to its own confirmation
            // UI when `onSuccess` fires.
            onSuccess?.(email)
          }}
        />
        <P className="sr-only">{t.modalDescription}</P>
      </Modal>
    </>
  )
}
