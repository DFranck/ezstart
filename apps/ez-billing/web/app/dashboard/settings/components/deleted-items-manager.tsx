'use client'

import { Button, Card, H4 } from '@ezstart/ui/components'

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
  if (items.length === 0) {
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
      <H4>{title} ({items.length})</H4>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
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
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                Restore
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to permanently delete this ${type.slice(0, -1)}? This action cannot be undone.`)) {
                    onHardDelete(item._id)
                  }
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete Forever
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}