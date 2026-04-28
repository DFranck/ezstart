'use client'

import { Div, Modal, P, Span } from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import type { ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthModalShellProps {
  /** Whether the modal is open. */
  isOpen: boolean
  /** Callback fired when the modal should close (X icon, Esc, overlay click). */
  onClose?: () => void
  /** Modal title (e.g. "Sign in to MyApp"). */
  title?: ReactNode
  /** Optional subtitle / description shown below the title. */
  subtitle?: ReactNode
  /** Form content (the actual `<SignInForm>` / `<SignUpForm>` / etc.). */
  children: ReactNode
  /** Footer cross-link content (e.g. "Don't have an account? Sign up"). */
  footer?: ReactNode
  /** Brand logo shown center-top above the title. */
  logo?: ReactNode
  /** Show theme switcher in the modal header (default: true). */
  showThemeSwitcher?: boolean
  /** Modal max-width — defaults to `'default'`. */
  size?: 'sm' | 'default' | 'lg'
  /** Extra className appended to the Modal content. */
  className?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Internal shell for self-contained auth modals (`<SignInModal>` /
 * `<SignUpModal>` / etc.). Wraps the underlying `<Modal>` with a consistent
 * header (centered logo + title + subtitle, theme switcher in the corner) and
 * a centered footer slot for cross-links. The Modal close X (top-right, built
 * in via Radix Dialog) is the dismiss affordance — no separate back button.
 *
 * Consumers should reach for the public `<SignInModal>` / `<SignUpModal>` /
 * etc. components instead of using this directly. Exported for advanced
 * custom modals only.
 *
 * @internal
 */
export function AuthModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  logo,
  showThemeSwitcher = true,
  size = 'default',
  className,
}: AuthModalShellProps) {
  // Build a centered header node for the Modal `title` prop. Modal wraps the
  // node inside Radix `DialogTitle` (renders as `<h2>`), so we use inline-safe
  // `<Span>` elements rather than `<Div>` to avoid block-in-heading nesting.
  // The Modal's built-in close button sits top-right (via Radix Dialog), so
  // the theme switcher is anchored top-left to balance the chrome.
  const headerNode =
    logo || title ? (
      <Span className="flex flex-col items-center gap-3 text-center">
        {logo && <Span className="flex justify-center">{logo}</Span>}
        {title && <Span className="block text-xl md:text-2xl font-bold">{title}</Span>}
      </Span>
    ) : undefined

  // Modal wraps `description` inside Radix `DialogDescription` (renders as
  // `<p>`), so the wrapper must be inline (Span) to avoid block-in-paragraph
  // hydration warnings.
  const descriptionNode = subtitle ? (
    <Span className="block text-center text-xs md:text-sm text-muted-foreground">{subtitle}</Span>
  ) : undefined

  const footerNode = footer ? (
    <P size="xs" className="text-center w-full">
      {footer}
    </P>
  ) : undefined

  return (
    <Modal
      isOpen={isOpen}
      {...(onClose ? { onClose } : {})}
      size={size}
      scrollBehavior="inside"
      title={headerNode}
      {...(descriptionNode ? { description: descriptionNode } : {})}
      {...(footerNode ? { footer: footerNode } : {})}
      {...(className ? { className } : {})}
    >
      {showThemeSwitcher && (
        <Div className="absolute top-3 left-3 z-10">
          <ThemeSwitcher />
        </Div>
      )}
      <Div className="space-y-4">{children}</Div>
    </Modal>
  )
}
