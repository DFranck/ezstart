'use client'

import { useEffect } from 'react'
import { useDevice } from '../../hooks'
import { useDeprecationWarning } from '../../hooks/use-deprecation-warning'
import { cn } from '../../lib/utils'
import { dialogVariantConfig } from '../../lib/design-system/variants'
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext'
import { warnDeprecation } from '@ezstart/logger'
import { toast } from 'sonner'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

/**
 * Modal Component - 100% Configurable & Accessible
 *
 * Built on Radix UI Dialog primitives for maximum accessibility (WCAG 2.1 AA).
 * Agnostic wrapper that supports all use cases from simple alerts to complex forms.
 *
 * @example
 * // Basic usage
 * <Modal isOpen={open} onClose={() => setOpen(false)}>
 *   <p>Modal content</p>
 * </Modal>
 *
 * @example
 * // With title, description, and footer
 * <Modal
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 *   title="Create Invoice"
 *   description="Fill in the invoice details"
 *   footer={<Button>Submit</Button>}
 * >
 *   <InvoiceForm />
 * </Modal>
 *
 * @example
 * // Custom size and scroll behavior
 * <Modal
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 *   size="xl"
 *   scrollBehavior="outside"
 * >
 *   <LargeContent />
 * </Modal>
 */

export type ModalSize =
  | 'sm'
  | 'default'
  | 'lg'
  | 'xl'
  | 'full'
  | /** @deprecated Use 'default' instead */ 'md'
export type ModalScrollBehavior = 'inside' | 'outside'

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal should close */
  onClose?: () => void
  /** Additional CSS classes for DialogContent */
  className?: string
  /** Modal content */
  children: React.ReactNode
  /** Hide the close button (X icon) */
  noCross?: boolean
  /** Disable closing on overlay click */
  disableOverlayClick?: boolean
  /** Disable closing on Escape key */
  disableEscapeKey?: boolean
  /** Modal title (appears in DialogHeader) */
  title?: string | React.ReactNode
  /** Modal description (appears below title) */
  description?: string | React.ReactNode
  /** Modal footer (action buttons) */
  footer?: React.ReactNode
  /** Modal size preset */
  size?: ModalSize
  /** Where scrolling happens: inside content or whole modal */
  scrollBehavior?: ModalScrollBehavior
}

const SIZE_CLASSES = dialogVariantConfig.size

export const Modal = ({
  isOpen,
  onClose,
  className,
  children,
  noCross = false,
  disableOverlayClick = false,
  disableEscapeKey = false,
  title: propTitle,
  description: propDescription,
  footer: propFooter,
  size: sizeProp,
  scrollBehavior = 'inside',
}: ModalProps) => {
  const inherited = useDesignTokens()
  const size = (sizeProp ?? inherited.size ?? 'lg') as ModalSize
  const { isMobile } = useDevice()

  // Surface deprecation warning when consumer passes the legacy 'md' size value.
  useEffect(() => {
    if (sizeProp === ('md' as ModalSize)) {
      warnDeprecation("Modal size='md'", "size='default'", {
        toast: msg => toast.warning(msg),
      })
    }
  }, [sizeProp])
  const handleOpenChange = (open: boolean) => {
    if (!open && !disableOverlayClick && onClose) {
      onClose()
    }
  }

  const handleEscapeKeyDown = (e: KeyboardEvent) => {
    if (disableEscapeKey) {
      e.preventDefault()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'bg-background shadow-2xl',
          // Size classes (will be most restrictive on desktop where size < 98vw from DialogContent)
          SIZE_CLASSES[size],
          // Mobile width override
          isMobile && 'max-w-[98vw]',
          // Outside scroll: let the whole modal scroll instead of inside body
          scrollBehavior === 'outside' && 'overflow-y-auto',
          className
        )}
        showCloseButton={!noCross}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        {/* Header */}
        {propTitle || propDescription ? (
          <DialogHeader>
            <DialogTitle>
              {propTitle ? propTitle : <div className="sr-only">Untitled Modal</div>}
            </DialogTitle>
            {propDescription && <DialogDescription>{propDescription}</DialogDescription>}
          </DialogHeader>
        ) : (
          <DialogTitle className="sr-only">Modal</DialogTitle>
        )}

        {/* Content */}
        {scrollBehavior === 'inside' ? <DialogBody>{children}</DialogBody> : children}

        {/* Footer */}
        {propFooter && <DialogFooter>{propFooter}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use named export Modal instead
 */
function DeprecatedDefaultModal(props: ModalProps) {
  useDeprecationWarning('Modal default export', 'named export `Modal` from @ezstart/ui/components')
  return <Modal {...props} />
}

DeprecatedDefaultModal.displayName = 'DeprecatedDefaultModal'

export default DeprecatedDefaultModal
