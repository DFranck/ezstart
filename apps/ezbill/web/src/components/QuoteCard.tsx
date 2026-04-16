'use client'

import { Button, Icon, Span } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { DeleteConfirmationDialog } from './delete-confirmation-dialog'
import { DocumentCard, type BaseDocumentCardProps } from './DocumentCard'
import { ValidityBadge } from './document-card-badges'

interface QuoteCardProps extends Omit<BaseDocumentCardProps, 'onKeyDown'> {
  validUntil?: string
  permissions: {
    canEdit?: boolean
    canDelete?: boolean
    canSend?: boolean
    canAccept?: boolean
    canDecline?: boolean
    canConvertToInvoice?: boolean
    reason?: string
  }
  onEdit: (e: React.MouseEvent) => void
  onDelete?: (e: React.MouseEvent) => void
  onSend?: (e: React.MouseEvent) => void
  onAccept?: (e: React.MouseEvent) => void
  onDecline?: (e: React.MouseEvent) => void
  onDownload?: (e: React.MouseEvent) => void
  onConvertToInvoice: (e: React.MouseEvent) => void
}

export function QuoteCard({
  documentNumber,
  status,
  createdAt,
  total,
  currency,
  validUntil,
  permissions,
  onClick,
  onEdit,
  onDelete,
  onSend,
  onAccept,
  onDecline,
  onDownload,
  onConvertToInvoice,
  className,
}: QuoteCardProps) {
  const [deleteDialog, setDeleteDialog] = useState(false)
  const tDelete = useTranslations('delete')
  const tQuote = useTranslations('quote')
  const t = useTranslations('documentCard')

  const statusConfig = {
    accepted: { bg: 'bg-ezbill-accepted/10', text: 'text-ezbill-accepted' },
    rejected: { bg: 'bg-ezbill-rejected/10', text: 'text-ezbill-rejected' },
    sent: { bg: 'bg-ezbill-sent/10', text: 'text-ezbill-sent' },
    draft: { bg: 'bg-ezbill-draft/10', text: 'text-ezbill-draft' },
    default: { bg: 'bg-muted', text: 'text-muted-foreground' },
  }

  return (
    <>
      <DocumentCard
        type="quote"
        documentNumber={documentNumber}
        status={status}
        createdAt={createdAt}
        total={total}
        currency={currency}
        icon="lucide:FileText"
        iconGradient="bg-gradient-quote"
        focusRingColor="focus:ring-2 focus:ring-ezbill-quote/30"
        statusConfig={statusConfig}
        onClick={onClick}
        className={className}
        additionalInfo={
          <>
            <Span className="text-sm text-muted-foreground">
              {validUntil
                ? t('validUntil', { date: new Date(validUntil).toLocaleDateString() })
                : t('validUntilNone')}
            </Span>
            <ValidityBadge status={status} validUntil={validUntil} />
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              disabled={!permissions.canEdit}
              title={!permissions.canEdit ? permissions.reason : undefined}
              className={cn({ hidden: !permissions.canEdit })}
            >
              <Icon name="lucide:Edit" className="w-5 h-5 sm:w-4 sm:h-4" />
            </Button>
            {permissions.canDelete && onDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={e => {
                  e.stopPropagation()
                  setDeleteDialog(true)
                }}
                className="text-destructive hover:text-destructive/90 hover:bg-destructive/5"
              >
                <Icon name="lucide:Trash2" className="w-5 h-5 sm:w-4 sm:h-4" />
              </Button>
            )}
            {permissions.canSend && onSend && (
              <Button
                size="sm"
                onClick={onSend}
                className="bg-ezbill-sent hover:bg-ezbill-sent/90 text-ezbill-sent-foreground"
              >
                <Icon name="lucide:Send" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
                <Span className="hidden xs:inline sm:hidden md:inline">{t('send')}</Span>
              </Button>
            )}
            {permissions.canAccept && onAccept && (
              <Button
                size="sm"
                onClick={onAccept}
                className="bg-ezbill-accepted hover:bg-ezbill-accepted/90 text-ezbill-accepted-foreground"
              >
                <Icon name="lucide:Check" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
                <Span className="hidden xs:inline sm:hidden md:inline">{t('accept')}</Span>
              </Button>
            )}
            {permissions.canDecline && onDecline && (
              <Button
                size="sm"
                onClick={onDecline}
                className="bg-ezbill-rejected hover:bg-ezbill-rejected/90 text-ezbill-rejected-foreground"
              >
                <Icon name="lucide:X" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
                <Span className="hidden xs:inline sm:hidden md:inline">{t('decline')}</Span>
              </Button>
            )}
            {onDownload && (
              <Button size="sm" variant="outline" onClick={onDownload}>
                <Icon name="lucide:Download" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
                <Span className="hidden xs:inline sm:hidden md:inline">{t('download')}</Span>
              </Button>
            )}
            {permissions.canConvertToInvoice && (
              <Button
                size="sm"
                onClick={onConvertToInvoice}
                className="bg-ezbill-invoice hover:bg-ezbill-invoice/90 text-ezbill-invoice-foreground"
              >
                <Icon name="lucide:ArrowRight" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
                <Span className="hidden xs:inline sm:hidden md:inline">{t('invoice')}</Span>
              </Button>
            )}
          </>
        }
      />

      <DeleteConfirmationDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={() => {
          if (onDelete) {
            onDelete({} as React.MouseEvent)
          }
          setDeleteDialog(false)
        }}
        title={tQuote('delete')}
        description={tDelete('quoteDescription', { number: documentNumber })}
        confirmText={tDelete('confirmQuote')}
      />
    </>
  )
}
