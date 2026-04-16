'use client'

import { Button, Input, Modal, P } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

interface KeyCreatedModalProps {
  isOpen: boolean
  onClose: () => void
  rawKey: string | null
}

export function KeyCreatedModal({ isOpen, onClose, rawKey }: KeyCreatedModalProps) {
  const t = useTranslations('developer.created')

  const handleCopy = useCallback(async () => {
    if (!rawKey) return
    await navigator.clipboard.writeText(rawKey)
    toast.success(t('copied'))
  }, [rawKey, t])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('title')}
      size="lg"
      footer={
        <Button onClick={onClose} className="w-full">
          {t('done')}
        </Button>
      }
    >
      <div className="space-y-4">
        <P className="text-destructive font-medium">{t('warning')}</P>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={rawKey ?? ''}
            className="font-mono text-sm"
          />
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {t('copyKey')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
