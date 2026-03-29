'use client'

import { useState } from 'react'
import { logger } from '@ezstart/logger'
import { Button, Input, Label, TextArea, P, Modal } from '@ezstart/ui/components'
import { useCreateWorkspace } from '@/hooks/useWorkspaces'
import { useTranslations } from 'next-intl'

export function CreateWorkspaceDialog() {
  const t = useTranslations('forms.createWorkspace')
  const tActions = useTranslations('actions')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')

  const createWorkspace = useCreateWorkspace()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createWorkspace.mutateAsync({
        name,
        slug,
        description,
      })

      // Reset form and close
      setName('')
      setSlug('')
      setDescription('')
      setOpen(false)
    } catch (error) {
      logger.error('Failed to create workspace:', error)
    }
  }

  const handleNameChange = (value: string) => {
    setName(value)
    // Auto-generate slug from name
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, '-')) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      )
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{t('newWorkspace')}</Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={t('title')}
        description={t('description')}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tActions('cancel')}
            </Button>
            <Button type="submit" form="create-workspace-form" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? tActions('creating') : t('createWorkspace')}
            </Button>
          </>
        }
      >
        <form id="create-workspace-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder={t('namePlaceholder')}
              required
              minLength={1}
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="slug">{t('slug')}</Label>
            <Input
              id="slug"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={t('slugPlaceholder')}
              required
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9\-]+"
            />
            <P className="text-xs text-muted-foreground mt-1">
              /forms/w/<strong>{slug || 'workspace-slug'}</strong>/projects
            </P>
            {createWorkspace.error && (
              <P className="text-xs text-destructive mt-1">
                {(createWorkspace.error as any)?.message?.includes('409') ||
                (createWorkspace.error as any)?.message?.includes('already exists')
                  ? t('slugTaken', { slug })
                  : (createWorkspace.error as any)?.message || 'Failed to create workspace'}
              </P>
            )}
          </div>

          <div>
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <TextArea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              maxLength={500}
              rows={3}
            />
          </div>
        </form>
      </Modal>
    </>
  )
}
