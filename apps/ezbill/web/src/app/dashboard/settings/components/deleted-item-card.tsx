'use client'

import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { Client, Company, Invoice, Quote, Receipt } from '@ezbill/types'
import { Button } from '@ezstart/ui/components'
import { useState } from 'react'

type DeletedItem = Client | Company | Invoice | Quote | Receipt

interface DeletedItemCardProps {
  item: DeletedItem
  type: 'clients' | 'companies' | 'quotes' | 'invoices' | 'receipts'
  onRestore: (id: string) => Promise<void>
  onHardDelete: (id: string) => Promise<void>
}

const getDisplayName = (item: DeletedItem, type: string): string => {
  if (type === 'clients') return (item as Client).clientName
  if (type === 'companies') return (item as Company).companyName
  if (type === 'quotes' || type === 'invoices' || type === 'receipts')
    return (item as Invoice | Quote | Receipt).documentNumber
  return 'Unknown'
}

const getDescription = (item: DeletedItem, type: string): string => {
  if (type === 'clients' || type === 'companies') {
    const emailItem = item as Client | Company
    return emailItem.email || 'No email'
  }
  if (type === 'quotes' || type === 'invoices' || type === 'receipts') {
    const doc = item as Invoice | Quote | Receipt
    return `${doc.total.toFixed(2)} ${doc.currency}`
  }
  return ''
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

export function DeletedItemCard({ item, type, onRestore, onHardDelete }: DeletedItemCardProps) {
  const [deleteDialog, setDeleteDialog] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
        <div className="flex-1">
          <div className="font-medium">{getDisplayName(item, type)}</div>
          <div className="text-sm text-muted-foreground">{getDescription(item, type)}</div>
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
            onClick={() => setDeleteDialog(true)}
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/5"
          >
            Delete Forever
          </Button>
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={() => {
          onHardDelete(item._id)
          setDeleteDialog(false)
        }}
        title="Permanently Delete Item"
        description={`Are you sure you want to permanently delete "${getDisplayName(item, type)}"? This action cannot be undone.`}
        confirmText="Delete Forever"
      />
    </>
  )
}
