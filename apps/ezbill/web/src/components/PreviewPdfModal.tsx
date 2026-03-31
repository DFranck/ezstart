'use client'

import { useBillingContext } from '@/contexts/billing-context'
import { convertToInvoicePDFData, convertToReceiptPDFData } from '@/utils/pdf-converters'
import { Invoice, Quote, Receipt } from '@ezbill/types'
import { Button, Icon, Modal, Div, H3, P, Span } from '@ezstart/ui/components'
import { useInvoicePDF } from '@/hooks/useInvoicePDF'
import { InvoicePDF, ReceiptPDF } from '@ezbill/templates'
import type { PDFInvoiceData, PDFReceiptData } from '@ezbill/types'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

/** Discriminated union for preview */
export type PreviewKind = 'invoice' | 'quote' | 'receipt'
export type PreviewDoc = (Invoice | Quote | Receipt) & { _id: string }
export type PreviewState = { isOpen: boolean; kind?: PreviewKind; doc?: PreviewDoc }

const getDocTitle = (kind: PreviewKind, doc: PreviewDoc) =>
  `${kind.charAt(0).toUpperCase() + kind.slice(1)} #${(doc as Invoice | Quote | Receipt).documentNumber ?? doc._id}`

const getPdfUrl = (kind: PreviewKind, doc: PreviewDoc) => {
  // Prefer explicit url if your doc already carries one
  const explicit = (doc as Record<string, unknown>).pdfUrl as string | undefined
  if (explicit) return explicit

  // Fallback: REST endpoint convention
  const base = kind === 'invoice' ? 'invoices' : kind === 'quote' ? 'quotes' : 'receipts'
  return `/api/billing/${base}/${doc._id}/pdf`
}

interface PreviewPdfModalProps {
  isOpen: boolean
  onClose: () => void
  kind?: PreviewKind
  doc?: PreviewDoc
}

/** Lightweight, reusable PDF preview modal */
export function PreviewPdfModal({ isOpen, onClose, kind, doc }: PreviewPdfModalProps) {
  const { downloadInvoicePDF, isGenerating } = useInvoicePDF()
  const { clients, companies, paymentMethods } = useBillingContext()
  const [pdfBlob, setPdfBlob] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const t = useTranslations('preview')
  const tToast = useTranslations('toast')

  // ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS
  // Générer le preview automatiquement à l'ouverture
  React.useEffect(() => {
    if (
      isOpen &&
      (kind === 'invoice' || kind === 'receipt') &&
      !pdfBlob &&
      !isGeneratingPreview &&
      doc
    ) {
      const generatePreview = async () => {
        if (kind !== 'invoice' && kind !== 'receipt') {
          return
        }

        const document = doc as Invoice | Receipt
        const client = clients.find(c => c._id === document.clientId)
        const company = document.companyId
          ? companies.find(c => c._id === document.companyId)
          : undefined

        if (!client) return

        setIsGeneratingPreview(true)
        try {
          const { pdf } = await import('@react-pdf/renderer')
          let blob: Blob

          if (kind === 'invoice') {
            const pdfData = convertToInvoicePDFData(
              document as Invoice,
              client,
              company,
              paymentMethods
            )
            blob = await pdf(<InvoicePDF data={pdfData} />).toBlob()
          } else {
            const pdfData = convertToReceiptPDFData(document as Receipt, client, company)
            blob = await pdf(<ReceiptPDF data={pdfData} />).toBlob()
          }

          const url = URL.createObjectURL(blob)
          setPdfBlob(url)
        } catch (error) {
          toast.error(tToast('pdfPreviewError'))
        } finally {
          setIsGeneratingPreview(false)
        }
      }
      generatePreview()
    }
  }, [isOpen, kind, pdfBlob, isGeneratingPreview, doc, clients, companies, paymentMethods])

  if (!isOpen || !kind || !doc) return null

  const title = getDocTitle(kind, doc)
  const pdfUrl = getPdfUrl(kind, doc)

  const generatePDFData = () => {
    if (kind !== 'invoice' && kind !== 'receipt') return null

    const document = doc as Invoice | Receipt
    const client = clients.find(c => c._id === document.clientId)
    const company = document.companyId
      ? companies.find(c => c._id === document.companyId)
      : undefined

    if (!client) return null

    if (kind === 'invoice') {
      return convertToInvoicePDFData(document as Invoice, client, company, paymentMethods)
    } else {
      return convertToReceiptPDFData(document as Receipt, client, company)
    }
  }

  const handleGeneratePreview = async () => {
    if (kind !== 'invoice' && kind !== 'receipt') {
      toast.error(tToast('pdfOnlyInvoiceReceipt'))
      return
    }

    const pdfData = generatePDFData()
    if (!pdfData) {
      toast.error(tToast('clientNotFound'))
      return
    }

    setIsGeneratingPreview(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      let blob: Blob

      if (kind === 'invoice') {
        blob = await pdf(<InvoicePDF data={pdfData as PDFInvoiceData} />).toBlob()
      } else {
        blob = await pdf(<ReceiptPDF data={pdfData as PDFReceiptData} />).toBlob()
      }

      const url = URL.createObjectURL(blob)
      setPdfBlob(url)
    } catch (error) {
      toast.error(tToast('pdfPreviewError'))
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleDownloadPDF = async () => {
    const pdfData = generatePDFData()
    if (!pdfData) {
      toast.error(tToast('clientNotFound'))
      return
    }

    try {
      const document = doc as Invoice | Receipt
      const fileName = document.documentNumber || document._id

      if (kind === 'invoice') {
        await downloadInvoicePDF(<InvoicePDF data={pdfData as PDFInvoiceData} />, fileName)
      } else {
        // For receipts, use the same download mechanism but with receipt template
        const { pdf } = await import('@react-pdf/renderer')
        const blob = await pdf(<ReceiptPDF data={pdfData as PDFReceiptData} />).toBlob()

        // Create download link
        const url = URL.createObjectURL(blob)
        const link = window.document.createElement('a')
        link.href = url
        link.download = `receipt-${fileName}.pdf`
        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      toast.error(tToast('pdfDownloadError'))
    }
  }

  // Nettoyer l'URL quand le modal se ferme
  const handleClose = () => {
    if (pdfBlob) {
      URL.revokeObjectURL(pdfBlob)
      setPdfBlob(null)
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <>
          <Icon
            name={
              kind === 'invoice'
                ? 'lucide:FileEdit'
                : kind === 'quote'
                  ? 'lucide:FileText'
                  : 'lucide:Receipt'
            }
            className="w-5 h-5 mr-2 text-foreground/60"
          />
          <Span className="font-semibold">{title}</Span>
        </>
      }
      description={<>{t('escToClose')}</>}
      footer={
        <Div className="flex items-center justify-between w-full">
          <Div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview}
              className="hover:bg-muted/50"
            >
              <Icon
                name={isGeneratingPreview ? 'lucide:Loader2' : 'lucide:Eye'}
                className={`w-4 h-4 mr-2 ${isGeneratingPreview ? 'animate-spin' : ''}`}
              />
              {isGeneratingPreview ? t('generating') : t('refreshPreview')}
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGenerating || !pdfBlob}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Icon
                name={isGenerating ? 'lucide:Loader2' : 'lucide:Download'}
                className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`}
              />
              {isGenerating ? t('downloading') : t('downloadPdf')}
            </Button>
          </Div>
        </Div>
      }
      className="max-w-[1100px] w-[98vw]"
    >
      {/* PDF container */}
      <Div className="">
        {pdfBlob ? (
          <>
            {/* Desktop PDF Preview */}
            <iframe
              src={`${pdfBlob}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="hidden sm:block w-full h-[50vh]"
              title={`${title} – PDF preview`}
            />
            {/* Mobile PDF Download */}
            <Div className="sm:hidden flex flex-col items-center justify-center p-8 text-center h-[50vh] bg-muted/20 rounded-lg">
              <Div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mb-4">
                <Icon name="lucide:FileDown" className="w-8 h-8 text-primary" />
              </Div>
              <H3 className="text-lg font-semibold text-foreground mb-2">{t('pdfReady')}</H3>
              <P className="text-foreground/60 mb-4 text-sm">{t('mobileNoPreview')}</P>
              <Button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = pdfBlob
                  link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="bg-primary hover:bg-primary/90"
              >
                <Icon name="lucide:Download" className="w-4 h-4 mr-2" />
                {t('downloadPdf')}
              </Button>
            </Div>
          </>
        ) : (
          <Div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
            <Div className="w-20 h-20 bg-gradient-to-r from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mb-6">
              <Icon
                name={isGeneratingPreview ? 'lucide:Loader2' : 'lucide:FileText'}
                className={`w-10 h-10 text-primary ${isGeneratingPreview ? 'animate-spin' : ''}`}
              />
            </Div>
            <H3 className="text-xl font-semibold text-foreground mb-2">
              {isGeneratingPreview ? t('generatingPreview') : t('instantGeneration')}
            </H3>
            <P className="text-foreground/60 mb-6 max-w-md">
              {isGeneratingPreview
                ? t('pleaseWait')
                : t('clickRefresh', {
                    kind: kind === 'invoice' ? 'invoice' : kind === 'quote' ? 'quote' : 'receipt',
                  })}
            </P>
            <Div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Icon name="lucide:Zap" className="w-4 h-4 text-warning" />
              <Span>{t('clientSideGeneration')}</Span>
            </Div>
          </Div>
        )}
      </Div>
    </Modal>
  )
}
