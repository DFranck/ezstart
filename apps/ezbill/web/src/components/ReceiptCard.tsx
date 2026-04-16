'use client'

import { Button, Icon, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { DocumentCard, type BaseDocumentCardProps } from './DocumentCard'

interface ReceiptCardProps extends Omit<BaseDocumentCardProps, 'onKeyDown'> {
  paymentDate?: string
  onDownload?: (e: React.MouseEvent) => void
}

export function ReceiptCard({
  documentNumber,
  status,
  createdAt,
  total,
  currency,
  onClick,
  onDownload,
  className,
}: ReceiptCardProps) {
  const t = useTranslations('documentCard')

  const statusConfig = {
    refunded: { bg: 'bg-ezbill-rejected/10', text: 'text-ezbill-rejected' },
    default: { bg: 'bg-ezbill-paid/10', text: 'text-ezbill-paid' },
  }

  return (
    <DocumentCard
      type="receipt"
      documentNumber={documentNumber}
      status={status}
      createdAt={createdAt}
      total={total}
      currency={currency}
      icon="lucide:Receipt"
      iconGradient="bg-gradient-receipt"
      focusRingColor="focus:ring-2 focus:ring-ezbill-receipt/30"
      statusConfig={statusConfig}
      onClick={onClick}
      className={className}
      actions={
        onDownload && (
          <Button size="sm" variant="outline" onClick={onDownload} title={t('download')}>
            <Icon name="lucide:Download" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
            <Span className="hidden xs:inline sm:hidden md:inline">{t('download')}</Span>
          </Button>
        )
      }
    />
  )
}
