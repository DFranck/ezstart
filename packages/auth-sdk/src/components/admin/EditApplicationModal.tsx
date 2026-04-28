'use client'

import { Button, Div, Input, Label, Modal, P, Spinner, Textarea } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import { useUpdateApplication } from '../../react/applications.js'
import type {
  AdminApplicationRow,
  AuthApplicationsSectionTexts,
} from './AdminApplications.types.js'

export interface EditApplicationModalProps {
  application: AdminApplicationRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  t: Required<AuthApplicationsSectionTexts>
}

/**
 * Modal that lets a superadmin edit name / description of an Application.
 * Slug is immutable per backend contract. Internal sub-component of
 * `<AuthAdminDashboard>`.
 *
 * @internal
 */
export function EditApplicationModal({
  application,
  open,
  onOpenChange,
  onSaved,
  t,
}: EditApplicationModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (application) {
      setName(application.name)
      setDescription(application.description ?? '')
      setError('')
    }
  }, [application])

  const update = useUpdateApplication({
    onSuccess: () => {
      toast.success(t.editSuccess)
      onSaved()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      const message = err.message || t.editError
      setError(message)
      toast.error(t.editError)
    },
  })

  const handleSave = () => {
    if (!application) return
    setError('')
    update.mutate({
      id: application.id,
      data: {
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
      },
    })
  }

  if (!application) return null

  const canSubmit = !!name.trim() && !update.isPending

  return (
    <Modal
      isOpen={open}
      onClose={() => !update.isPending && onOpenChange(false)}
      size="default"
      title={t.editTitle}
      description={t.editDescription}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit}>
            {update.isPending ? <Spinner size="sm" /> : t.save}
          </Button>
        </>
      }
    >
      <Div className="space-y-4">
        {error && (
          <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </Div>
        )}

        <Div className="space-y-2">
          <Label htmlFor="admin-app-slug">{t.editSlugLabel}</Label>
          <Input id="admin-app-slug" value={application.slug} disabled readOnly />
          <P className="text-xs text-muted-foreground">{t.editSlugHelp}</P>
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="admin-app-name">{t.editNameLabel}</Label>
          <Input
            id="admin-app-name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            disabled={update.isPending}
          />
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="admin-app-description">{t.editDescriptionLabel}</Label>
          <Textarea
            id="admin-app-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={update.isPending}
          />
        </Div>
      </Div>
    </Modal>
  )
}
