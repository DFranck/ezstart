'use client'

import { cn } from '../lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog'

export const Modal = ({
  isOpen,
  onClose,
  className,
  children,
  noCross,
  title: propTitle,
  description: propDescription,
}: {
  isOpen: boolean
  onClose?: () => void
  className?: string
  children: React.ReactNode
  noCross?: boolean
  title?: string | React.ReactNode
  description?: string | React.ReactNode
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose?.()}>
      <DialogContent
        className={cn(
          'max-h-[80vh] max-w-[98vw] flex flex-col overflow-hidden bg-background/70 backdrop-blur-sm shadow-2xl',
          className
        )}
        showCloseButton={!noCross}
      >
        <DialogHeader>
          <DialogTitle>
            {propTitle ? propTitle : <div className="sr-only">Untitled Modal</div>}
          </DialogTitle>
          {propDescription && (
            <DialogDescription id="modal-description">{propDescription}</DialogDescription>
          )}
        </DialogHeader>

        <div className="overflow-auto" style={{ maxHeight: 'calc(70vh - 6rem)' }}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
