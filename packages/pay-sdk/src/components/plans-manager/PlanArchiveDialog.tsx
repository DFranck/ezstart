'use client'

/**
 * Confirmation dialog shown when archiving a plan from the PlansManager.
 *
 * Wraps `<AlertDialog>` so the parent stays focused on data orchestration.
 *
 * @internal
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
} from '@ezstart/ui/components'
import type { Plan } from '../../core/types.js'
import type { PlansManagerTexts } from './plans-manager-types.js'

export interface PlanArchiveDialogProps {
  target: Plan | null
  isArchiving: boolean
  onConfirm: () => void
  onCancel: () => void
  texts: PlansManagerTexts
}

export function PlanArchiveDialog({
  target,
  isArchiving,
  onConfirm,
  onCancel,
  texts,
}: PlanArchiveDialogProps) {
  return (
    <AlertDialog open={!!target} onOpenChange={open => !open && !isArchiving && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{texts.actions.archiveConfirm}</AlertDialogTitle>
          <AlertDialogDescription>{texts.actions.archiveConfirmDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isArchiving}>
            {texts.actions.archiveCancel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isArchiving}>
            {texts.actions.archive}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
