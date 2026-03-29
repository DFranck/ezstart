import {
  Button,
  Card,
  CardContent,
  Icon,
  KnownIconName,
  Div,
  H3,
  P,
  Span,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { ReactNode, useState } from 'react'
import { DeleteConfirmationDialog } from './delete-confirmation-dialog'

interface BaseDocumentCardProps {
  documentNumber: string
  status: string
  createdAt: string
  total: number
  currency: string
  onClick: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  className?: string
  children?: ReactNode
}

interface DocumentCardProps extends BaseDocumentCardProps {
  type: 'invoice' | 'quote' | 'receipt'
  icon: KnownIconName
  iconGradient: string
  focusRingColor: string
  statusConfig: Record<string, { bg: string; text: string }>
  additionalInfo?: ReactNode
  actions?: ReactNode
}

export function DocumentCard({
  type,
  documentNumber,
  status,
  createdAt,
  total,
  currency,
  icon,
  iconGradient,
  focusRingColor,
  statusConfig,
  additionalInfo,
  actions,
  onClick,
  onKeyDown,
  className,
  children,
}: DocumentCardProps) {
  const statusStyles = statusConfig[status] ||
    statusConfig.default || { bg: 'bg-muted', text: 'text-muted-foreground' }

  const borderClasses = {
    invoice: 'border-ezbill-invoice/20 hover:border-ezbill-invoice/40',
    quote: 'border-ezbill-quote/20 hover:border-ezbill-quote/40',
    receipt: 'border-ezbill-receipt/20 hover:border-ezbill-receipt/40',
  }

  return (
    <Div className="group relative">
      <Card
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown || (e => (e.key === 'Enter' || e.key === ' ') && onClick())}
        className={cn(
          'hover:shadow-xl hover:shadow-foreground/10 transition-all duration-300 outline-none cursor-pointer group-hover:-translate-y-1',
          borderClasses[type],
          focusRingColor,
          className
        )}
      >
        <CardContent>
          <Div
            className={
              type === 'invoice' || type === 'receipt'
                ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
                : 'flex items-center justify-between'
            }
          >
            <Div className="flex items-center space-x-2 sm:space-x-4">
              <Div
                className={cn(
                  'rounded-xl flex items-center justify-center',
                  iconGradient,
                  type === 'invoice' || type === 'receipt'
                    ? 'w-10 h-10 sm:w-12 sm:h-12'
                    : 'w-12 h-12'
                )}
              >
                <Icon
                  name={icon}
                  className={
                    type === 'invoice' || type === 'receipt'
                      ? 'w-5 h-5 sm:w-6 sm:h-6 text-white'
                      : 'w-6 h-6 text-white'
                  }
                />
              </Div>
              <Div>
                <H3
                  className={cn(
                    'font-semibold text-foreground',
                    type === 'invoice' || type === 'receipt' ? 'text-base sm:text-lg' : 'text-lg'
                  )}
                >
                  #{documentNumber}
                </H3>
                <Div className="flex flex-wrap items-center gap-2 sm:space-x-4 sm:gap-0 mt-1">
                  <Span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      statusStyles.bg,
                      statusStyles.text
                    )}
                  >
                    {status}
                  </Span>
                  <Span className="text-xs sm:text-sm text-muted-foreground">
                    {new Date(createdAt).toLocaleDateString()}
                  </Span>
                  {additionalInfo}
                </Div>
              </Div>
            </Div>

            <Div
              className={
                type === 'invoice' || type === 'receipt'
                  ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-4 sm:gap-0'
                  : 'flex items-center space-x-4'
              }
            >
              <Div
                className={
                  type === 'invoice' || type === 'receipt'
                    ? 'text-left sm:text-right'
                    : 'text-right'
                }
              >
                <P
                  className={cn(
                    'font-bold text-foreground',
                    type === 'invoice' || type === 'receipt'
                      ? 'text-lg sm:text-xl lg:text-2xl'
                      : 'text-2xl'
                  )}
                >
                  ${total} {currency}
                </P>
              </Div>

              {actions && (
                <Div
                  className={
                    type === 'invoice' || type === 'receipt'
                      ? 'flex flex-wrap gap-2 justify-start sm:justify-end'
                      : 'flex space-x-2'
                  }
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                >
                  {actions}
                </Div>
              )}
            </Div>
          </Div>
          {children}
        </CardContent>
      </Card>
    </Div>
  )
}

// Specialized Invoice Card
interface InvoiceCardProps extends Omit<BaseDocumentCardProps, 'onKeyDown'> {
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
  permissions,
  onClick,
  onEdit,
  onSend,
  onDownload,
  onDownloadReceipt,
  onMarkPaid,
  className,
}: InvoiceCardProps) {
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
              <Span className="hidden xs:inline sm:hidden md:inline">Send</Span>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Icon name="lucide:Download" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
            <Span className="hidden xs:inline sm:hidden md:inline">Download</Span>
          </Button>
          {status === 'paid' && onDownloadReceipt && (
            <Button size="sm" variant="outline" onClick={onDownloadReceipt}>
              <Icon name="lucide:Receipt" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
              <Span className="hidden xs:inline sm:hidden md:inline">Receipt</Span>
            </Button>
          )}
          {permissions.canMarkAsPaid && (
            <Button
              size="sm"
              onClick={onMarkPaid}
              className="bg-ezbill-paid hover:bg-ezbill-paid/90 text-ezbill-paid-foreground"
            >
              <Icon name="lucide:CheckCircle" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
              <Span className="hidden xs:inline sm:hidden md:inline">Mark Paid</Span>
              <Span className="inline xs:hidden sm:inline md:hidden">Paid</Span>
            </Button>
          )}
        </>
      }
    />
  )
}

// Specialized Quote Card
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
          <Span className="text-sm text-muted-foreground">
            Valid until: {validUntil ? new Date(validUntil).toLocaleDateString() : '-'}
          </Span>
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
                <Span className="hidden xs:inline sm:hidden md:inline">Send</Span>
              </Button>
            )}
            {permissions.canAccept && onAccept && (
              <Button
                size="sm"
                onClick={onAccept}
                className="bg-ezbill-accepted hover:bg-ezbill-accepted/90 text-ezbill-accepted-foreground"
              >
                <Icon name="lucide:Check" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
                <Span className="hidden xs:inline sm:hidden md:inline">Accept</Span>
              </Button>
            )}
            {permissions.canDecline && onDecline && (
              <Button
                size="sm"
                onClick={onDecline}
                className="bg-ezbill-rejected hover:bg-ezbill-rejected/90 text-ezbill-rejected-foreground"
              >
                <Icon name="lucide:X" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
                <Span className="hidden xs:inline sm:hidden md:inline">Decline</Span>
              </Button>
            )}
            {onDownload && (
              <Button size="sm" variant="outline" onClick={onDownload}>
                <Icon name="lucide:Download" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
                <Span className="hidden xs:inline sm:hidden md:inline">Download</Span>
              </Button>
            )}
            {permissions.canConvertToInvoice && (
              <Button
                size="sm"
                onClick={onConvertToInvoice}
                className="bg-ezbill-invoice hover:bg-ezbill-invoice/90 text-ezbill-invoice-foreground"
              >
                <Icon name="lucide:ArrowRight" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
                <Span className="hidden xs:inline sm:hidden md:inline">Invoice</Span>
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
        title="Delete Quote"
        description={`Are you sure you want to delete quote #${documentNumber}? This will move it to trash.`}
        confirmText="Delete Quote"
      />
    </>
  )
}

// Specialized Receipt Card
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
  paymentDate,
  onClick,
  onDownload,
  className,
}: ReceiptCardProps) {
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
          <Button size="sm" variant="outline" onClick={onDownload} title="Download receipt">
            <Icon name="lucide:Download" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />
            <Span className="hidden xs:inline sm:hidden md:inline">Download</Span>
          </Button>
        )
      }
    />
  )
}
