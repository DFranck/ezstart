'use client'

import { useState } from 'react'
import { Button, Input, Label, TextArea } from '@ezstart/ui/components'
import { useCreateWorkspace } from '@/hooks/useWorkspaces'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ezstart/ui/components'

export function CreateWorkspaceDialog() {
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
      console.error('Failed to create workspace:', error)
    }
  }

  const handleNameChange = (value: string) => {
    setName(value)
    // Auto-generate slug from name
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, '-')) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ New Workspace</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your forms and projects
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Workspace Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g., Acme Inspections"
              required
              minLength={1}
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g., acme-inspections"
              required
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9-]+"
            />
            <P className="text-xs text-muted-foreground mt-1">
              /forms/w/<strong>{slug || 'workspace-slug'}</strong>/projects
            </P>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <TextArea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your workspace..."
              maxLength={500}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={className}>{children}</p>
}
