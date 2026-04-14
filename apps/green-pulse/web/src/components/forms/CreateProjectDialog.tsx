'use client'

import { useState } from 'react'
import { logger } from '@ezstart/logger'
import { Button, Div, Input, Label, Modal, P, Textarea } from '@ezstart/ui/components'
import { useCreateProject } from '@/hooks/useProjects'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useTranslations } from 'next-intl'

interface CreateProjectDialogProps {
  workspaceSlug: string
}

export function CreateProjectDialog({ workspaceSlug }: CreateProjectDialogProps) {
  const t = useTranslations('forms.createProject')
  const tActions = useTranslations('actions')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companySector, setCompanySector] = useState('')

  const createProject = useCreateProject()
  const { data: workspaces = [] } = useWorkspaces()

  // Find workspace ID from slug (list is returned unwrapped by api-sdk)
  const workspace = workspaces.find(w => w.slug === workspaceSlug)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!workspace?._id) {
      logger.error('Workspace not found')
      return
    }

    try {
      await createProject.mutateAsync({
        workspaceId: workspace._id,
        name,
        description,
        companyName,
        companyAddress,
        companySector,
      })

      // Reset form and close
      setName('')
      setDescription('')
      setCompanyName('')
      setCompanyAddress('')
      setCompanySector('')
      setOpen(false)
    } catch (error) {
      logger.error('Failed to create project:', error)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{t('newProject')}</Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={t('title')}
        description={t('description')}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tActions('cancel')}
            </Button>
            <Button type="submit" form="create-project-form" disabled={createProject.isPending}>
              {createProject.isPending ? tActions('creating') : t('createProject')}
            </Button>
          </>
        }
      >
        <form id="create-project-form" onSubmit={handleSubmit} className="space-y-4">
          <Div>
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              required
            />
          </Div>

          <Div>
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={2}
            />
          </Div>

          <Div className="border-t pt-4">
            <P className="text-sm font-medium mb-3">{t('companyInfo')}</P>

            <Div className="space-y-3">
              <Div>
                <Label htmlFor="companyName">{t('companyName')}</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder={t('companyNamePlaceholder')}
                />
              </Div>

              <Div>
                <Label htmlFor="companyAddress">{t('address')}</Label>
                <Input
                  id="companyAddress"
                  value={companyAddress}
                  onChange={e => setCompanyAddress(e.target.value)}
                  placeholder={t('addressPlaceholder')}
                />
              </Div>

              <Div>
                <Label htmlFor="companySector">{t('sector')}</Label>
                <Input
                  id="companySector"
                  value={companySector}
                  onChange={e => setCompanySector(e.target.value)}
                  placeholder={t('sectorPlaceholder')}
                />
              </Div>
            </Div>
          </Div>
        </form>
      </Modal>
    </>
  )
}
