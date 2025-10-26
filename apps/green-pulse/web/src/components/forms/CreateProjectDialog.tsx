'use client'

import { useState } from 'react'
import { Button, Input, Label, TextArea, P } from '@ezstart/ui/components'
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

interface CreateProjectDialogProps {
  workspaceSlug: string
}

export function CreateProjectDialog({ workspaceSlug }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companySector, setCompanySector] = useState('')

  const createProject = useCreateProject()
  const { data: workspacesData } = useWorkspaces()

  // Find workspace ID from slug
  const workspace = workspacesData?.data?.workspaces?.find(
    (w: any) => w.slug === workspaceSlug
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!workspace?._id) {
      console.error('Workspace not found')
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
      console.error('Failed to create project:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ New Project</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project (case/dossier) to organize form instances
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Inspection ABC Corp - 2025-10-26"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <TextArea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this project..."
              rows={2}
            />
          </div>

          <div className="border-t pt-4">
            <P className="text-sm font-medium mb-3">Company Information (Optional)</P>

            <div className="space-y-3">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g., ABC Corporation"
                />
              </div>

              <div>
                <Label htmlFor="companyAddress">Address</Label>
                <Input
                  id="companyAddress"
                  value={companyAddress}
                  onChange={e => setCompanyAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, Paris"
                />
              </div>

              <div>
                <Label htmlFor="companySector">Sector</Label>
                <Input
                  id="companySector"
                  value={companySector}
                  onChange={e => setCompanySector(e.target.value)}
                  placeholder="e.g., Technology, Manufacturing, Services"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
