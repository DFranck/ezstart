import { Button, Card, CardContent, Icon, KnownIconName } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { ReactNode } from 'react'

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

  return (
    <div className="group relative">
      <Card
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown || (e => (e.key === 'Enter' || e.key === ' ') && onClick())}
        className={cn(
          'hover:shadow-xl transition-all duration-300 outline-none cursor-pointer group-hover:-translate-y-1',
          focusRingColor,
          className
        )}
      >
      <CardContent>
        <div
          className={
            type === 'invoice'
              ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
              : 'flex items-center justify-between'
          }
        >
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div
              className={cn(
                'rounded-xl flex items-center justify-center',
                iconGradient,
                type === 'invoice' ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-12 h-12'
              )}
            >
              <Icon
                name={icon}
                className={
                  type === 'invoice' ? 'w-5 h-5 sm:w-6 sm:h-6 text-white' : 'w-6 h-6 text-white'
                }
              />
            </div>
            <div>
              <h3
                className={cn(
                  'font-semibold text-foreground',
                  type === 'invoice' ? 'text-base sm:text-lg' : 'text-lg'
                )}
              >
                #{documentNumber}
              </h3>
              <div className="flex flex-wrap items-center gap-2 sm:space-x-4 sm:gap-0 mt-1">
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    statusStyles.bg,
                    statusStyles.text
                  )}
                >
                  {status}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {new Date(createdAt).toLocaleDateString()}
                </span>
                {additionalInfo}
              </div>
            </div>
          </div>

          <div
            className={
              type === 'invoice'
                ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-4 sm:gap-0'
                : 'flex items-center space-x-4'
            }
          >
            <div className={type === 'invoice' ? 'text-left sm:text-right' : 'text-right'}>
              <p
                className={cn(
                  'font-bold text-foreground',
                  type === 'invoice' ? 'text-lg sm:text-xl lg:text-2xl' : 'text-2xl'
                )}
              >
                ${total} {currency}
              </p>
            </div>

            {actions && (
              <div
                className={
                  type === 'invoice'
                    ? 'flex flex-wrap gap-2 justify-start sm:justify-end'
                    : 'flex space-x-2'
                }
                onClick={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
              >
                {actions}
              </div>
            )}
          </div>
        </div>
        {children}
      </CardContent>
      </Card>
    </div>
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
    paid: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-300' },
    sent: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-300' },
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
      iconGradient="bg-gradient-to-r from-blue-400 to-indigo-400"
      focusRingColor="focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600"
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
            <Icon name="lucide:Edit" className="w-4 h-4" />
          </Button>
          {permissions.canSend && (
            <Button size="sm" onClick={onSend} className="bg-primary hover:bg-primary/90 text-white">
              <Icon name="lucide:Send" className="w-4 h-4 sm:mr-1" />
              <span className="hidden xs:inline sm:hidden md:inline">Send</span>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Icon name="lucide:Download" className="w-4 h-4 sm:mr-1" />
            <span className="hidden xs:inline sm:hidden md:inline">Download</span>
          </Button>
          {status === 'paid' && onDownloadReceipt && (
            <Button size="sm" variant="outline" onClick={onDownloadReceipt}>
              <Icon name="lucide:Receipt" className="w-4 h-4 sm:mr-1" />
              <span className="hidden xs:inline sm:hidden md:inline">Receipt</span>
            </Button>
          )}
          {permissions.canMarkAsPaid && (
            <Button
              size="sm"
              onClick={onMarkPaid}
              className="bg-success hover:bg-success/90 text-white"
            >
              <Icon name="lucide:CheckCircle" className="w-4 h-4 sm:mr-1" />
              <span className="hidden xs:inline sm:hidden md:inline">Mark Paid</span>
              <span className="inline xs:hidden sm:inline md:hidden">Paid</span>
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
    canSend?: boolean
    canAccept?: boolean
    canDecline?: boolean
    canConvertToInvoice?: boolean
    reason?: string
  }
  onEdit: (e: React.MouseEvent) => void
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
  onSend,
  onAccept,
  onDecline,
  onDownload,
  onConvertToInvoice,
  className,
}: QuoteCardProps) {
  const statusConfig = {
    accepted: {
      bg: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-green-800 dark:text-green-300',
    },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-300' },
    sent: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-300' },
    default: { bg: 'bg-muted', text: 'text-muted-foreground' },
  }

  return (
    <DocumentCard
      type="quote"
      documentNumber={documentNumber}
      status={status}
      createdAt={createdAt}
      total={total}
      currency={currency}
      icon="lucide:FileText"
      iconGradient="bg-gradient-to-r from-green-400 to-emerald-400"
      focusRingColor="focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600"
      statusConfig={statusConfig}
      onClick={onClick}
      className={className}
      additionalInfo={
        <span className="text-sm text-muted-foreground">
          Valid until: {validUntil ? new Date(validUntil).toLocaleDateString() : '-'}
        </span>
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
            <Icon name="lucide:Edit" className="w-4 h-4" />
          </Button>
          {permissions.canSend && onSend && (
            <Button size="sm" onClick={onSend} className="bg-primary hover:bg-primary/90 text-white">
              <Icon name="lucide:Send" className="w-4 h-4 sm:mr-1" />
              <span className="hidden xs:inline sm:hidden md:inline">Send</span>
            </Button>
          )}
          {permissions.canAccept && onAccept && (
            <Button size="sm" onClick={onAccept} className="bg-success hover:bg-success/90 text-white">
              <Icon name="lucide:Check" className="w-4 h-4 sm:mr-1" />
              <span className="hidden xs:inline sm:hidden md:inline">Accept</span>
            </Button>
          )}
          {permissions.canDecline && onDecline && (
            <Button size="sm" onClick={onDecline} className="bg-destructive hover:bg-red-600 text-white">
              <Icon name="lucide:X" className="w-4 h-4 sm:mr-1" />
              <span className="hidden xs:inline sm:hidden md:inline">Decline</span>
            </Button>
          )}
          {onDownload && (
            <Button size="sm" variant="outline" onClick={onDownload}>
              <Icon name="lucide:Download" className="w-4 h-4 sm:mr-1" />
              <span className="hidden xs:inline sm:hidden md:inline">Download</span>
            </Button>
          )}
          {permissions.canConvertToInvoice && (
            <Button
              size="sm"
              onClick={onConvertToInvoice}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Icon name="lucide:ArrowRight" className="w-4 h-4 sm:mr-1" />
              <span className="hidden xs:inline sm:hidden md:inline">Invoice</span>
            </Button>
          )}
        </>
      }
    />
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
    refunded: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-300' },
    default: {
      bg: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-green-800 dark:text-green-300',
    },
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
      iconGradient="bg-gradient-to-r from-purple-400 to-pink-400"
      focusRingColor="focus:ring-2 focus:ring-fuchsia-300 dark:focus:ring-fuchsia-600"
      statusConfig={statusConfig}
      onClick={onClick}
      className={className}
      additionalInfo={
        <span className="text-sm text-muted-foreground">
          Payment: {paymentDate ? new Date(paymentDate).toLocaleDateString() : '-'}
        </span>
      }
      actions={
        onDownload && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDownload}
            title="Download receipt"
          >
            <Icon name="lucide:Download" className="w-4 h-4 sm:mr-1" />
            <span className="hidden xs:inline sm:hidden md:inline">Download</span>
          </Button>
        )
      }
    />
  )
}
