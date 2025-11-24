'use client'
import { Button, Icon, Modal, Span } from '@ezstart/ui/components'
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
      name: 'Email',
      icon: 'lucide:Mail' as const,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      href: `mailto:?subject=${documentLabel} ${documentNumber}&body=${encodedMessage}%0A%0A${encodedUrl}`,
    },
    {
      name: 'WhatsApp',
      icon: 'lucide:MessageCircle' as const,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      href: `https://wa.me/?text=${encodedMessage}%0A${encodedUrl}`,
    },
    {
      name: 'Telegram',
      icon: 'lucide:Send' as const,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
    },
    {
      name: 'Copy Link',
      icon: 'lucide:Copy' as const,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100',
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
      title={`Share ${documentLabel}`}
      description={`Share ${documentLabel} #${documentNumber} with ${clientName}`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {isAlreadySent ? (
              <>
                <Icon name="lucide:X" className="w-4 h-4 mr-2" />
                Close
              </>
            ) : (
              'Cancel'
            )}
          </Button>
          {!isAlreadySent && (
            <Button onClick={handleMarkAsSent} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icon name="lucide:Loader2" className="w-4 h-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <Icon name="lucide:Check" className="w-4 h-4 mr-2" />
                  Mark as Sent
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
                <p>
                  <strong className="text-foreground">Re-share your {documentType}</strong> with{' '}
                  <strong className="text-foreground">{clientName}</strong> using any method above.
                </p>
              ) : (
                <div className="space-y-1">
                  <p>
                    <strong className="text-foreground">Share your {documentType}</strong> using any
                    method above.
                  </p>
                  <p>
                    Once you've sent it to <strong className="text-foreground">{clientName}</strong>,
                    click <strong className="text-foreground">"Mark as Sent"</strong> below to update
                    the status.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
