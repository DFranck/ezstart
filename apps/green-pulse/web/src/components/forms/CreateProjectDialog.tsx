'use client'

import { useState } from 'react'
import { logger } from '@ezstart/logger'
import { Button, Div, Input, Label, P, TextArea } from '@ezstart/ui/components'
import { useCreateProject } from '@/hooks/useProjects'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ezstart/ui/components'
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
  const { data: workspacesData } = useWorkspaces()

  // Find workspace ID from slug
  // callApi wraps response: { ok, data: { success, data: { workspaces } } }
  const workspace = workspacesData?.data?.data?.workspaces?.find(
    (w: { slug: string }) => w.slug === workspaceSlug
  )

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t('newProject')}</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <TextArea
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? tActions('creating') : t('createProject')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
