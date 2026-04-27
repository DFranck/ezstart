'use client'

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
  Span,
} from '@ezstart/ui/components'
import { useEffect, useState } from 'react'
import type { CreateApiKeyRequest } from '../../core/types.js'
import { useApplication } from '../../react/applications.js'
import { logger } from '../internal-logger.js'
import type { CreateKeyModalTexts } from './types.js'

export interface CreateKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateApiKeyRequest) => void
  isSubmitting: boolean
  texts: CreateKeyModalTexts
  /** Show admin scope option (for superadmins only). */
  showAdminScope?: boolean
  /**
   * Application the new key will belong to (P6+). When provided, the app-scope
   * field is displayed as read-only (pre-filled with the application slug).
   */
  applicationId?: string
  /**
   * Legacy: list of app slugs the user has access to. Used as a fallback when
   * `applicationId` is not provided (pre-P6 callers). A `logger.warn` is logged
   * when this path is taken.
   * @deprecated Pass `applicationId` instead.
   */
  appOptions?: string[]
}

type KeyType = 'publishable' | 'secret'
type KeyEnv = 'live' | 'test'
type KeyScope = 'admin' | 'user' | 'readonly'

function computeExpiryDate(option: string): string | null {
  if (option === 'never') return null
  const now = new Date()
  const days: Record<string, number> = { '30d': 30, '90d': 90, '1y': 365 }
  const d = days[option]
  if (!d) return null
  now.setDate(now.getDate() + d)
  return now.toISOString()
}

export function CreateKeyModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  texts,
  showAdminScope = false,
  applicationId,
  appOptions = [],
}: CreateKeyModalProps) {
  // ---------------------------------------------------------------------------
  // Resolve the app scope display: either from an Application (P6 path)
  // or from legacy `appOptions` (pre-P6 fallback).
  // ---------------------------------------------------------------------------
  const { data: application } = useApplication(applicationId, !!applicationId && isOpen)

  // Warn once if a legacy caller is relying on appOptions without applicationId
  useEffect(() => {
    if (!isOpen) return
    if (!applicationId && appOptions.length > 0) {
      // Use the silent-by-default internal logger (no @ezstart/logger dep) so
      // consumers who wire `<AuthProvider logger={...} />` see the warning
      // and the rest stay quiet.
      logger.warn(
        '[auth-sdk] CreateKeyModal: `appOptions` is deprecated. Pass `applicationId` instead.'
      )
    }
  }, [isOpen, applicationId, appOptions.length])

  const legacyDefaultAppName = appOptions.length > 0 ? appOptions[0] : showAdminScope ? '*' : ''

  const [name, setName] = useState('')
  const [legacyAppName, setLegacyAppName] = useState(legacyDefaultAppName)
  const [type, setType] = useState<KeyType>('publishable')
  const [env, setEnv] = useState<KeyEnv>('live')
  const [scope, setScope] = useState<KeyScope>('user')
  const [expiry, setExpiry] = useState('never')

  // Reset legacy app when appOptions changes
  useEffect(() => {
    setLegacyAppName(legacyDefaultAppName)
  }, [legacyDefaultAppName])

  const canSubmitApp = applicationId ? !!application : !!legacyAppName
  const canSubmit = !!name.trim() && canSubmitApp && !isSubmitting

  const handleSubmit = () => {
    if (!canSubmit) return
    if (applicationId) {
      onSubmit({
        name: name.trim(),
        applicationId,
        type,
        env,
        scope,
        expiresAt: computeExpiryDate(expiry),
      })
    } else {
      onSubmit({
        name: name.trim(),
        appName: legacyAppName,
        type,
        env,
        scope,
        expiresAt: computeExpiryDate(expiry),
      })
    }
  }

  const handleClose = () => {
    setName('')
    setLegacyAppName(legacyDefaultAppName)
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
          <Label htmlFor="key-name">{texts.nameLabel}</Label>
          <Input
            id="key-name"
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
          <Label htmlFor="key-app-scope">{texts.appScope}</Label>
          {applicationId ? (
            <Input id="key-app-scope" value={application?.slug ?? ''} readOnly disabled />
          ) : (
            <Select value={legacyAppName} onValueChange={setLegacyAppName}>
              <SelectTrigger id="key-app-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {showAdminScope && <SelectItem value="*">{texts.appScopeAll}</SelectItem>}
                {appOptions.map(app => (
                  <SelectItem key={app} value={app}>
                    {app}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {applicationId && application?.name && (
            <P className="text-xs text-muted-foreground">
              <Span>{application.name}</Span>
            </P>
          )}
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
