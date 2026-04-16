'use client'

import { Button, Icon, Span } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useTranslations } from 'next-intl'
import { DocumentCard, type BaseDocumentCardProps } from './DocumentCard'
import { DueDateBadge } from './document-card-badges'

interface InvoiceCardProps extends Omit<BaseDocumentCardProps, 'onKeyDown'> {
  dueDate?: string
  permissions: {
    canEdit?: boolean
    canSend?: boolean
    canMarkAsPaid?: boolean
    reason?: string
  }
  onEdit: (e: React.MouseEvent) => void
  onSend: (e: React.MouseEvent) => void
  onDownload: (e: React.MouseEvent) => void
  onDownloadReceipt?: (e: React.MouseEvent) => void
  onMarkPaid: (e: React.MouseEvent) => void
}

export function InvoiceCard({
  documentNumber,
  status,
  createdAt,
  total,
  currency,
  dueDate,
  permissions,
  onClick,
  onEdit,
  onSend,
  onDownload,
  onDownloadReceipt,
  onMarkPaid,
  className,
}: InvoiceCardProps) {
  const t = useTranslations('documentCard')

  const statusConfig = {
    paid: { bg: 'bg-ezbill-paid/10', text: 'text-ezbill-paid' },
    sent: { bg: 'bg-ezbill-sent/10', text: 'text-ezbill-sent' },
    draft: { bg: 'bg-ezbill-draft/10', text: 'text-ezbill-draft' },
    default: { bg: 'bg-muted', text: 'text-muted-foreground' },
  }

  return (
    <DocumentCard
      type="invoice"
      documentNumber={documentNumber}
      status={status}
      createdAt={createdAt}
      total={total}
      currency={currency}
      icon="lucide:FileEdit"
      iconGradient="bg-gradient-invoice"
      focusRingColor="focus:ring-2 focus:ring-ezbill-invoice/30"
      statusConfig={statusConfig}
      onClick={onClick}
      className={className}
      additionalInfo={<DueDateBadge status={status} dueDate={dueDate} />}
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
          {permissions.canSend && (
            <Button
              size="sm"
              onClick={onSend}
              className="bg-ezbill-sent hover:bg-ezbill-sent/90 text-ezbill-sent-foreground"
            >
              <Icon name="lucide:Send" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
              <Span className="hidden xs:inline sm:hidden md:inline">{t('send')}</Span>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Icon name="lucide:Download" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
            <Span className="hidden xs:inline sm:hidden md:inline">{t('download')}</Span>
          </Button>
          {status === 'paid' && onDownloadReceipt && (
            <Button size="sm" variant="outline" onClick={onDownloadReceipt}>
              <Icon name="lucide:Receipt" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
              <Span className="hidden xs:inline sm:hidden md:inline">{t('receipt')}</Span>
            </Button>
          )}
          {permissions.canMarkAsPaid && (
            <Button
              size="sm"
              onClick={onMarkPaid}
              className="bg-ezbill-paid hover:bg-ezbill-paid/90 text-ezbill-paid-foreground"
            >
              <Icon name="lucide:CheckCircle" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
              <Span className="hidden xs:inline sm:hidden md:inline">{t('markPaid')}</Span>
              <Span className="inline xs:hidden sm:inline md:hidden">{t('markPaidShort')}</Span>
            </Button>
          )}
        </>
      }
    />
  )
}
