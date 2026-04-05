'use client'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Icon,
  P,
} from '@ezstart/ui/components'
import { useCallback, useEffect, useState } from 'react'

type DialogState = 'confirm' | 'loading' | 'success' | 'error'

export interface ConfirmActionDialogTexts {
  confirmLabel?: string
  cancelLabel?: string
  loadingMessage?: string
  successMessage?: string
  errorMessage?: string
  retryLabel?: string
  closeLabel?: string
}

export interface ConfirmActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => Promise<void>
  variant?: 'destructive' | 'default'
  autoCloseDelay?: number
  texts?: ConfirmActionDialogTexts
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  variant = 'destructive',
  autoCloseDelay = 2000,
  texts,
}: ConfirmActionDialogProps) {
  const [state, setState] = useState<DialogState>('confirm')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  const t = {
    confirmLabel: texts?.confirmLabel || 'Confirm',
    cancelLabel: texts?.cancelLabel || 'Cancel',
    loadingMessage: texts?.loadingMessage || 'Operation in progress...',
    successMessage: texts?.successMessage || 'Operation completed successfully',
    errorMessage: texts?.errorMessage || 'Operation failed',
    retryLabel: texts?.retryLabel || 'Retry',
    closeLabel: texts?.closeLabel || 'Close',
  }

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setState('confirm')
      setErrorDetail(null)
    }
  }, [open])

  // Auto-close on success
  useEffect(() => {
    if (state === 'success' && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onOpenChange(false)
      }, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [state, autoCloseDelay, onOpenChange])

  const handleConfirm = useCallback(async () => {
    setState('loading')
    setErrorDetail(null)
    try {
      await onConfirm()
      setState('success')
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : String(err))
      setState('error')
    }
  }, [onConfirm])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Prevent closing during loading
  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (state === 'loading') return
      onOpenChange(value)
    },
    [state, onOpenChange]
  )

  return (
    <AlertDialog variant={variant} open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {state === 'loading' && (
              <span className="flex items-center gap-2">
                <Icon name="lucide:Loader2" className="w-5 h-5 animate-spin" />
                {title}
              </span>
            )}
            {state === 'success' && (
              <span className="flex items-center gap-2">
                <Icon name="lucide:CircleCheck" className="w-5 h-5 text-green-500" />
                {title}
              </span>
            )}
            {state === 'error' && (
              <span className="flex items-center gap-2">
                <Icon name="lucide:CircleX" className="w-5 h-5 text-destructive" />
                {title}
              </span>
            )}
            {state === 'confirm' && title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {state === 'confirm' && description}
            {state === 'loading' && t.loadingMessage}
            {state === 'success' && t.successMessage}
            {state === 'error' && (
              <span className="flex flex-col gap-1">
                <span>{t.errorMessage}</span>
                {errorDetail && (
                  <P size="sm" className="text-muted-foreground font-mono break-all">
                    {errorDetail}
                  </P>
                )}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {state === 'confirm' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t.cancelLabel}
              </Button>
              <Button variant={variant} onClick={handleConfirm}>
                {t.confirmLabel}
              </Button>
            </>
          )}

          {state === 'loading' && (
            <>
              <Button variant="outline" disabled>
                {t.cancelLabel}
              </Button>
              <Button variant={variant} disabled>
                <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin mr-2" />
                {t.confirmLabel}
              </Button>
            </>
          )}

          {state === 'success' && (
            <Button variant="outline" onClick={handleClose}>
              {t.closeLabel}
            </Button>
          )}

          {state === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t.closeLabel}
              </Button>
              <Button variant={variant} onClick={handleConfirm}>
                {t.retryLabel}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
