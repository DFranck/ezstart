'use client'

/**
 * Modal dialog for creating a new EZPay API key scoped to an ezauth Application.
 *
 * The caller provides the `applicationId` (required — the ezauth backend rejects
 * unowned Applications). The Application slug is resolved from the ezauth API
 * via `useApplication` and displayed read-only in the form.
 *
 * Peer dependencies: `@tanstack/react-query` (via auth-sdk's `useApplication`),
 * `@ezstart/api-sdk`, `@ezstart/ui`.
 */

import {
  Button,
  Div,
  Input,
  Label,
  Modal,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components'
import { useApplication } from '@ezstart/auth-sdk'
import { useState } from 'react'
import type { CreatePayApiKeyRequest } from '../../core/types.js'
import type { CreatePayKeyModalTexts } from './types.js'

export interface CreatePayKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreatePayApiKeyRequest) => void
  isSubmitting: boolean
  texts: CreatePayKeyModalTexts
  /** Application the new key will belong to. Required (ezauth enforces ownership). */
  applicationId: string
  /** Show admin scope option (for superadmins only). */
  showAdminScope?: boolean
}

type KeyType = 'publishable' | 'secret'
type KeyEnv = 'live' | 'test'
type KeyScope = 'admin' | 'user' | 'readonly'

/** Translate a UI expiry option to an ISO string (or null for no expiry). */
function computeExpiryDate(option: string): string | null {
  if (option === 'never') return null
  const now = new Date()
  const days: Record<string, number> = { '30d': 30, '90d': 90, '1y': 365 }
  const d = days[option]
  if (!d) return null
  now.setDate(now.getDate() + d)
  return now.toISOString()
}

export function CreatePayKeyModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  texts,
  applicationId,
  showAdminScope = false,
}: CreatePayKeyModalProps) {
  const { data: application } = useApplication(applicationId, isOpen)

  const [name, setName] = useState('')
  const [type, setType] = useState<KeyType>('publishable')
  const [env, setEnv] = useState<KeyEnv>('live')
  const [scope, setScope] = useState<KeyScope>('user')
  const [expiry, setExpiry] = useState('never')

  const canSubmit = !!name.trim() && !!application && !isSubmitting

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      applicationId,
      type,
      env,
      scope,
      expiresAt: computeExpiryDate(expiry),
    })
  }

  const handleClose = () => {
    setName('')
    setType('publishable')
    setEnv('live')
    setScope('user')
    setExpiry('never')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={texts.title}
      size="default"
      footer={
        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          {isSubmitting ? texts.submitting : texts.submit}
        </Button>
      }
    >
      <Div className="space-y-4">
        <Div className="space-y-2">
          <Label htmlFor="pay-key-name">{texts.nameLabel}</Label>
          <Input
            id="pay-key-name"
            placeholder={texts.namePlaceholder}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
          />
        </Div>

        <Div className="space-y-2">
          <Label>{texts.keyType}</Label>
          <Select value={type} onValueChange={v => setType(v as KeyType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publishable">{texts.keyTypePublishable}</SelectItem>
              <SelectItem value="secret">{texts.keyTypeSecret}</SelectItem>
            </SelectContent>
          </Select>
        </Div>

        <Div className="space-y-2">
          <Label>{texts.keyEnv}</Label>
          <Select value={env} onValueChange={v => setEnv(v as KeyEnv)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="live">{texts.keyEnvLive}</SelectItem>
              <SelectItem value="test">{texts.keyEnvTest}</SelectItem>
            </SelectContent>
          </Select>
        </Div>

        <Div className="space-y-2">
          <Label>{texts.keyScope}</Label>
          <Select value={scope} onValueChange={v => setScope(v as KeyScope)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">{texts.keyScopeUser}</SelectItem>
              <SelectItem value="readonly">{texts.keyScopeReadonly}</SelectItem>
              {showAdminScope && <SelectItem value="admin">{texts.keyScopeAdmin}</SelectItem>}
            </SelectContent>
          </Select>
          {scope === 'admin' && (
            <P className="text-xs text-destructive">{texts.keyScopeAdminWarning}</P>
          )}
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="pay-key-app-scope">{texts.appScope}</Label>
          <Input id="pay-key-app-scope" value={application?.slug ?? ''} readOnly disabled />
          {application?.name && <P className="text-xs text-muted-foreground">{application.name}</P>}
        </Div>

        <Div className="space-y-2">
          <Label>{texts.expiry}</Label>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">{texts.expiryNever}</SelectItem>
              <SelectItem value="30d">{texts.expiry30d}</SelectItem>
              <SelectItem value="90d">{texts.expiry90d}</SelectItem>
              <SelectItem value="1y">{texts.expiry1y}</SelectItem>
            </SelectContent>
          </Select>
        </Div>
      </Div>
    </Modal>
  )
}
