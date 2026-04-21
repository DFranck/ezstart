'use client'

import { Button, Div, Input, Label, Modal, P, Textarea } from '@ezstart/ui/components'
import { useEffect, useMemo, useState } from 'react'
import type { Application } from '../../core/types.js'
import { useCreateApplication, useMyApplications } from '../../react/applications.js'
import type { CreateApplicationModalTexts } from './types.js'
import { defaultApplicationsFlowTexts } from './types.js'

export interface CreateApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the newly-created Application after the mutation succeeds. */
  onCreated?: (app: Application) => void
  /** Partial texts override — falls back to English defaults. */
  texts?: Partial<CreateApplicationModalTexts>
}

const SLUG_REGEX = /^[a-z0-9-]{2,32}$/

/** Convert a free-form name into a kebab-case slug suggestion. */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

function mergeTexts(partial?: Partial<CreateApplicationModalTexts>): CreateApplicationModalTexts {
  if (!partial) return defaultApplicationsFlowTexts.create
  return { ...defaultApplicationsFlowTexts.create, ...partial }
}

export function CreateApplicationModal({
  isOpen,
  onClose,
  onCreated,
  texts: partialTexts,
}: CreateApplicationModalProps) {
  const texts = mergeTexts(partialTexts)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  // For slug uniqueness check
  const { data: existingApps } = useMyApplications(isOpen, { includeArchived: true })

  // Auto-derive slug from name unless user edited it manually
  useEffect(() => {
    if (!slugEdited) {
      setSlug(nameToSlug(name))
    }
  }, [name, slugEdited])

  const slugValidity = useMemo<'empty' | 'invalid' | 'taken' | 'valid'>(() => {
    if (!slug) return 'empty'
    if (!SLUG_REGEX.test(slug)) return 'invalid'
    if (existingApps?.some(a => a.slug === slug)) return 'taken'
    return 'valid'
  }, [slug, existingApps])

  const create = useCreateApplication({
    onSuccess: app => {
      resetAndClose()
      onCreated?.(app)
    },
    onError: err => {
      setSubmitError(err.message || texts.createFailed)
    },
  })

  const resetAndClose = () => {
    setName('')
    setSlug('')
    setSlugEdited(false)
    setDescription('')
    setSubmitError(null)
    onClose()
  }

  const canSubmit = !!name.trim() && slugValidity === 'valid' && !create.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    setSubmitError(null)
    create.mutate({
      slug,
      name: name.trim(),
      description: description.trim() || undefined,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !create.isPending && resetAndClose()}
      title={texts.title}
      description={texts.description}
      size="default"
      footer={
        <Div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetAndClose} disabled={create.isPending}>
            {texts.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {create.isPending ? texts.submitting : texts.submit}
          </Button>
        </Div>
      }
    >
      <Div className="space-y-4">
        <Div className="space-y-2">
          <Label htmlFor="application-name">{texts.nameLabel}</Label>
          <Input
            id="application-name"
            placeholder={texts.namePlaceholder}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={64}
          />
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="application-slug">{texts.slugLabel}</Label>
          <Input
            id="application-slug"
            placeholder={texts.slugPlaceholder}
            value={slug}
            onChange={e => {
              setSlugEdited(true)
              setSlug(e.target.value.toLowerCase())
            }}
            maxLength={32}
          />
          <P className="text-xs text-muted-foreground">{texts.slugHelp}</P>
          {slugValidity === 'invalid' && (
            <P className="text-xs text-destructive">{texts.slugInvalid}</P>
          )}
          {slugValidity === 'taken' && (
            <P className="text-xs text-destructive">{texts.slugTaken}</P>
          )}
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="application-description">{texts.descriptionLabel}</Label>
          <Textarea
            id="application-description"
            placeholder={texts.descriptionPlaceholder}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </Div>

        {submitError && <P className="text-sm text-destructive">{submitError}</P>}
      </Div>
    </Modal>
  )
}
