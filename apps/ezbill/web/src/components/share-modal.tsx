'use client'
import { Button, Icon, Modal, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  onMarkAsSent: () => void
  pdfUrl: string
  documentType: 'invoice' | 'quote'
  documentNumber: string
  clientName: string
  documentStatus: string
}

export function ShareModal({
  isOpen,
  onClose,
  onMarkAsSent,
  pdfUrl,
  documentType,
  documentNumber,
  clientName,
  documentStatus,
}: ShareModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations('share')
  const tCommon = useTranslations('common')

  const documentLabel = documentType === 'invoice' ? 'Invoice' : 'Quote'
  const shareMessage = `Hi! Here's your ${documentLabel} #${documentNumber}. Please find the PDF attached.`
  const encodedMessage = encodeURIComponent(shareMessage)
  const encodedUrl = encodeURIComponent(pdfUrl)
  const isAlreadySent = documentStatus === 'sent'

  const handleMarkAsSent = async () => {
    setIsLoading(true)
    await onMarkAsSent()
    setIsLoading(false)
  }

  const shareOptions = [
    {
      name: t('email'),
      icon: 'lucide:Mail' as const,
      color: 'text-primary',
      bgColor: 'bg-primary/5 hover:bg-primary/10',
      href: `mailto:?subject=${documentLabel} ${documentNumber}&body=${encodedMessage}%0A%0A${encodedUrl}`,
    },
    {
      name: t('whatsApp'),
      icon: 'lucide:MessageCircle' as const,
      color: 'text-success',
      bgColor: 'bg-success/5 hover:bg-success/10',
      href: `https://wa.me/?text=${encodedMessage}%0A${encodedUrl}`,
    },
    {
      name: t('telegram'),
      icon: 'lucide:Send' as const,
      color: 'text-primary',
      bgColor: 'bg-primary/5 hover:bg-primary/10',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
    },
    {
      name: t('copyLink'),
      icon: 'lucide:Copy' as const,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted hover:bg-muted/80',
      onClick: () => {
        navigator.clipboard.writeText(pdfUrl)
        // Could add a toast notification here
      },
    },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('title', { type: documentLabel })}
      description={t('description', {
        type: documentLabel,
        number: documentNumber,
        client: clientName,
      })}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {isAlreadySent ? (
              <>
                <Icon name="lucide:X" className="w-4 h-4 mr-2" />
                {tCommon('close')}
              </>
            ) : (
              tCommon('cancel')
            )}
          </Button>
          {!isAlreadySent && (
            <Button onClick={handleMarkAsSent} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icon name="lucide:Loader2" className="w-4 h-4 mr-2 animate-spin" />
                  {tCommon('marking')}
                </>
              ) : (
                <>
                  <Icon name="lucide:Check" className="w-4 h-4 mr-2" />
                  {tCommon('markAsSent')}
                </>
              )}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Share Options Grid */}
        <div className="grid grid-cols-2 gap-3">
          {shareOptions.map(option => (
            <a
              key={option.name}
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={option.onClick}
              className={`flex flex-col items-center justify-center p-6 rounded-xl border border-border ${option.bgColor} transition-all duration-200 hover:shadow-md`}
            >
              <Icon name={option.icon} className={`w-8 h-8 mb-2 ${option.color}`} />
              <Span className="text-sm font-medium text-foreground">{option.name}</Span>
            </a>
          ))}
        </div>

        {/* Info Card */}
        <div className="bg-muted/50 backdrop-blur-sm rounded-xl p-4 border border-border">
          <div className="flex items-start space-x-3">
            <Icon name="lucide:Info" className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              {isAlreadySent ? (
                <p>{t('reshareInfo', { type: documentType, client: clientName })}</p>
              ) : (
                <div className="space-y-1">
                  <p>{t('shareInfo', { type: documentType })}</p>
                  <p>{t('markAsSentInfo', { client: clientName })}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
