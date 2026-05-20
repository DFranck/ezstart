'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Input,
  Label,
  P,
  Span,
  Switch,
  Textarea,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import type { Application } from '../../../core/types.js'
import { useRevokeApplication, useUpdateApplication } from '../../../react/applications.js'
import type { ApplicationDetailViewTexts } from '../types.js'

interface SettingsTabProps {
  application: Application
  texts: ApplicationDetailViewTexts
  /** Invoked after a successful archive. Consumer typically routes away. */
  onArchived?: () => void
}

/**
 * Settings tab of `<ApplicationDetailView>`: editable name/description +
 * require-email-verification toggle, plus the archive danger zone with a
 * confirmation AlertDialog.
 *
 * @internal
 */
export function SettingsTab({ application, texts, onArchived }: SettingsTabProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [requireEmailVerification, setRequireEmailVerification] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setName(application.name)
    setDescription(application.description ?? '')
    setRequireEmailVerification(application.requireEmailVerification ?? false)
  }, [application])

  const updateMutation = useUpdateApplication({
    onSuccess: () => {
      toast.success(texts.settingsSaveSuccess)
    },
    onError: () => {
      toast.error(texts.settingsSaveFailed)
    },
  })

  const revokeMutation = useRevokeApplication({
    onSuccess: () => {
      toast.success(texts.archiveSuccess)
      setConfirmOpen(false)
      onArchived?.()
    },
    onError: () => {
      toast.error(texts.archiveFailed)
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      id: application.id,
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
        requireEmailVerification,
      },
    })
  }

  const isArchived = application.status === 'archived'
  const isDirty =
    name.trim() !== application.name ||
    (description.trim() || '') !== (application.description ?? '') ||
    requireEmailVerification !== (application.requireEmailVerification ?? false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{texts.settingsTitle}</CardTitle>
          <CardDescription>{texts.settingsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Div className="space-y-2">
            <Label htmlFor="detail-slug">{texts.settingsSlugLabel}</Label>
            <Div className="flex items-center">
              <Input id="detail-slug" value={application.slug} disabled readOnly />
            </Div>
            <P className="text-xs text-muted-foreground">
              <Span>{texts.settingsSlugHelp}</Span>
            </P>
          </Div>
          <Div className="space-y-2">
            <Label htmlFor="detail-name">{texts.settingsNameLabel}</Label>
            <Input
              id="detail-name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={64}
            />
          </Div>
          <Div className="space-y-2">
            <Label htmlFor="detail-description">{texts.settingsDescriptionLabel}</Label>
            <Textarea
              id="detail-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </Div>
          <Div className="flex items-start justify-between gap-4 rounded-md border border-border bg-muted/30 p-3">
            <Div className="space-y-1">
              <Label
                htmlFor="detail-require-email-verification"
                className="cursor-pointer text-sm font-medium"
              >
                {texts.settingsRequireEmailVerificationLabel}
              </Label>
              <P className="text-xs text-muted-foreground">
                {texts.settingsRequireEmailVerificationHelp}
              </P>
            </Div>
            <Switch
              id="detail-require-email-verification"
              checked={requireEmailVerification}
              onCheckedChange={setRequireEmailVerification}
            />
          </Div>
          <Div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending || !name.trim()}
            >
              {updateMutation.isPending ? texts.settingsSaving : texts.settingsSave}
            </Button>
          </Div>
        </CardContent>
      </Card>

      {!isArchived && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{texts.archiveSectionTitle}</CardTitle>
            <CardDescription>{texts.archiveSectionDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              {texts.archiveButton}
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.archiveConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{texts.archiveConfirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>
              {texts.archiveCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeMutation.mutate({ id: application.id, cascade: true })}
              disabled={revokeMutation.isPending}
            >
              {texts.archiveSubmit}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
