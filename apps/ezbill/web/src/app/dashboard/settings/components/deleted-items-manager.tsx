'use client'

import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { Button, Card, H4 } from '@ezstart/ui/components'
import { useState } from 'react'

interface DeletedItemsManagerProps<T extends { _id: string; deletedAt?: string }> {
  title: string
  items: T[]
  type: string
  getDisplayName: (item: T) => string
  getDescription: (item: T) => string
  onRestore: (id: string) => Promise<void>
  onHardDelete: (id: string) => Promise<void>
}

export function DeletedItemsManager<T extends { _id: string; deletedAt?: string }>({
  title,
  items,
  type,
  getDisplayName,
  getDescription,
  onRestore,
  onHardDelete,
}: DeletedItemsManagerProps<T>) {
  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : []
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    item: T | null
  }>({ isOpen: false, item: null })
  
  if (safeItems.length === 0) {
    return (
      <Card className="p-4">
        <H4>{title}</H4>
        <p className="text-sm text-muted-foreground mt-2">No deleted {title.toLowerCase()} found.</p>
      </Card>
    )
  }

  const formatDeletedDate = (deletedAt?: string) => {
    if (!deletedAt) return 'Unknown'
    try {
      return new Date(deletedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <Card className="p-4">
      <H4>{title} ({safeItems.length})</H4>
      <div className="mt-4 space-y-3">
        {safeItems.map((item) => (
          <div key={item._id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{getDisplayName(item)}</div>
              <div className="text-sm text-muted-foreground">{getDescription(item)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Deleted: {formatDeletedDate(item.deletedAt)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestore(item._id)}
                className="text-success hover:text-success/90 hover:bg-success/5"
              >
                Restore
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialog({ isOpen: true, item })}
                className="text-destructive hover:text-destructive/90 hover:bg-destructive/5"
              >
                Delete Forever
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, item: null })}
        onConfirm={() => {
          if (deleteDialog.item) {
            onHardDelete(deleteDialog.item._id)
          }
        }}
        title="Permanently Delete Item"
        description={`Are you sure you want to permanently delete "${
          deleteDialog.item ? getDisplayName(deleteDialog.item) : ''
        }"? This action cannot be undone.`}
        confirmText="Delete Forever"
      />
    </Card>
  )
}