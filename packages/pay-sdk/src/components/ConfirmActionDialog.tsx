'use client'

import {
  ConfirmActionDialog as _ConfirmActionDialog,
  type ConfirmActionDialogProps as _ConfirmActionDialogProps,
  type ConfirmActionDialogTexts as _ConfirmActionDialogTexts,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'

/**
 * @deprecated Moved to `@ezstart/ui` as `ConfirmActionDialog`. Will be
 * removed in 2026-08-01. Import from `@ezstart/ui/components` instead.
 */
export type ConfirmActionDialogProps = _ConfirmActionDialogProps
/**
 * @deprecated Moved to `@ezstart/ui` as `ConfirmActionDialog`. Will be
 * removed in 2026-08-01.
 */
export type ConfirmActionDialogTexts = _ConfirmActionDialogTexts

/**
 * Generic confirm-action dialog with built-in loading / success / error
 * states + auto-close on success + retry on error.
 *
 * @deprecated Moved to `@ezstart/ui` as `ConfirmActionDialog`. Will be
 * removed in 2026-08-01. Import from `@ezstart/ui/components` instead.
 *
 * @example migration
 * ```tsx
 * // before
 * import { ConfirmActionDialog } from '@ezstart/pay-sdk/components'
 *
 * // after
 * import { ConfirmActionDialog } from '@ezstart/ui/components'
 * // Same API, zero changes other than the import path.
 * ```
 */
export function ConfirmActionDialog(props: ConfirmActionDialogProps) {
  useDeprecationWarning(
    'ConfirmActionDialog from @ezstart/pay-sdk',
    'ConfirmActionDialog from @ezstart/ui/components'
  )
  return <_ConfirmActionDialog {...props} />
}

ConfirmActionDialog.displayName = 'ConfirmActionDialog'
