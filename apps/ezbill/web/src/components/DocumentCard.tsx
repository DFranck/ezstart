'use client'

import { Card, CardContent, Icon, KnownIconName, Div, H3, P, Span } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { ReactNode } from 'react'

export interface BaseDocumentCardProps {
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

  const isCompact = type === 'invoice' || type === 'receipt'

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
              isCompact
                ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
                : 'flex items-center justify-between'
            }
          >
            <Div className="flex items-center space-x-2 sm:space-x-4">
              <Div
                className={cn(
                  'rounded-xl flex items-center justify-center',
                  iconGradient,
                  isCompact ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-12 h-12'
                )}
              >
                <Icon
                  name={icon}
                  className={cn(
                    'text-primary-foreground',
                    isCompact ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-6 h-6'
                  )}
                />
              </Div>
              <Div>
                <H3
                  className={cn(
                    'font-semibold text-foreground',
                    isCompact ? 'text-base sm:text-lg' : 'text-lg'
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
                isCompact
                  ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-4 sm:gap-0'
                  : 'flex items-center space-x-4'
              }
            >
              <Div className={isCompact ? 'text-left sm:text-right' : 'text-right'}>
                <P
                  className={cn(
                    'font-bold text-foreground',
                    isCompact ? 'text-lg sm:text-xl lg:text-2xl' : 'text-2xl'
                  )}
                >
                  ${total} {currency}
                </P>
              </Div>

              {actions && (
                <Div
                  className={
                    isCompact
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

// Re-export specialized cards for backward compatibility
export { InvoiceCard } from './InvoiceCard'
export { QuoteCard } from './QuoteCard'
export { ReceiptCard } from './ReceiptCard'
