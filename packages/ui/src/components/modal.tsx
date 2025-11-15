'use client'

import { useDevice } from '../hooks'
import { responsive } from '../lib/design-system/tokens'
import { cn } from '../lib/utils'
import {
  Dialog,
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

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
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

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: responsive.modalWidth.sm, // max-w-sm
  md: responsive.modalWidth.md, // max-w-md
  lg: responsive.modalWidth.lg, // max-w-lg
  xl: responsive.modalWidth.xl, // max-w-2xl
  full: responsive.modalWidth.full, // max-w-[95vw]
}

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
  size = 'lg',
  scrollBehavior = 'inside',
}: ModalProps) => {
  const { isMobile } = useDevice()
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
          'flex flex-col bg-background shadow-2xl',
          // Size classes (will be most restrictive on desktop where size < 98vw from DialogContent)
          SIZE_CLASSES[size],
          // Scroll behavior
          isMobile && 'max-w-[98vw]',
          scrollBehavior === 'inside'
            ? 'max-h-[90vh] overflow-hidden'
            : 'max-h-[90vh] overflow-y-auto',
          className
        )}
        showCloseButton={!noCross}
        onEscapeKeyDown={handleEscapeKeyDown as any}
      >
        {/* Header */}
        {(propTitle || propDescription) && (
          <DialogHeader>
            <DialogTitle>
              {propTitle ? propTitle : <div className="sr-only">Untitled Modal</div>}
            </DialogTitle>
            {propDescription && <DialogDescription>{propDescription}</DialogDescription>}
          </DialogHeader>
        )}

        {/* Content */}
        <div
          className={cn(
            scrollBehavior === 'inside' && 'overflow-auto flex-1',
            scrollBehavior === 'inside' && 'max-h-[60vh]'
          )}
        >
          {children}
        </div>

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
export default Modal
