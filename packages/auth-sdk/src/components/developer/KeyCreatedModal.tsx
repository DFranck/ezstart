'use client'

import { Button, Div, Input, Modal, P } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useCallback } from 'react'
import type { KeyCreatedModalTexts } from './types.js'

export interface KeyCreatedModalProps {
  isOpen: boolean
  onClose: () => void
  rawKey: string | null
  texts: KeyCreatedModalTexts
}

/**
 * One-time display modal showing a freshly created API key with a
 * copy-to-clipboard action. The raw key is only available immediately
 * after creation — once the modal closes, the key cannot be recovered.
 *
 * @example
 * ```tsx
 * <KeyCreatedModal isOpen={!!rawKey} onClose={() => setRawKey(null)} rawKey={rawKey} texts={texts} />
 * ```
 */
export function KeyCreatedModal({ isOpen, onClose, rawKey, texts }: KeyCreatedModalProps) {
  const handleCopy = useCallback(async () => {
    if (!rawKey) return
    try {
      await navigator.clipboard.writeText(rawKey)
      toast.success(texts.copied)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }, [rawKey, texts.copied])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={texts.title}
      size="lg"
      footer={
        <Button onClick={onClose} className="w-full">
          {texts.done}
        </Button>
      }
    >
      <Div className="space-y-4">
        <P className="text-destructive font-medium">{texts.warning}</P>

        <Div className="flex items-center gap-2">
          <Input readOnly value={rawKey ?? ''} className="font-mono text-sm" />
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {texts.copyKey}
          </Button>
        </Div>
      </Div>
    </Modal>
  )
}
