import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import type { PDFInvoiceData, PDFReceiptData } from '@ezbill/types'
import type { PDFQuoteData } from '@ezbill/templates'

/** Convertit les données pour le template PDF Invoice */
export function convertToInvoicePDFData(
  invoice: Invoice,
  client: Client,
  company?: Company,
  paymentMethods?: PaymentMethod[]
): PDFInvoiceData {
  return {
    documentNumber: invoice.documentNumber || invoice._id,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
    status: invoice.status,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    billingType: invoice.billingType || 'itemized',
    items: invoice.items.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })),
    description: invoice.description,
    flatRateAmount: invoice.flatRateAmount,
    client: {
      clientName: client.clientName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      country: client.country,
      contactPersonName: client.contactPersonName,
      contactPersonEmail: client.contactPersonEmail,
      contactPersonPhone: client.contactPersonPhone,
      contactPersonTitle: client.contactPersonTitle,
    },
    company: company
      ? {
          companyName: company.companyName,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          country: company.country,
        }
      : undefined,
    notes: invoice.notes,
    terms: invoice.terms,
    // Legacy single payment method support (deprecated)
    paymentDetails:
      invoice.paymentMethodId && paymentMethods
        ? (() => {
            const paymentMethod = paymentMethods.find(pm => pm._id === invoice.paymentMethodId)
            if (!paymentMethod) return undefined

            return {
              methodName: paymentMethod.name,
              type: paymentMethod.type,
              walletAddress:
                paymentMethod.type === 'crypto_wallet' ? paymentMethod.walletAddress : undefined,
              currency: paymentMethod.type === 'crypto_wallet' ? paymentMethod.currency : undefined,
              network: paymentMethod.type === 'crypto_wallet' ? paymentMethod.network : undefined,
              bankName: paymentMethod.type === 'bank_transfer' ? paymentMethod.bankName : undefined,
              accountNumber:
                paymentMethod.type === 'bank_transfer' ? paymentMethod.accountNumber : undefined,
              iban: paymentMethod.type === 'bank_transfer' ? paymentMethod.iban : undefined,
              swift: paymentMethod.type === 'bank_transfer' ? paymentMethod.swift : undefined,
              routingNumber:
                paymentMethod.type === 'bank_transfer' ? paymentMethod.routingNumber : undefined,
              instructions: paymentMethod.instructions,
            }
          })()
        : undefined,
    // Multiple payment methods support
    paymentMethods:
      invoice.paymentMethodIds && paymentMethods && invoice.paymentMethodIds.length > 0
        ? invoice.paymentMethodIds
            .map(methodId => {
              const paymentMethod = paymentMethods.find(pm => pm._id === methodId)
              if (!paymentMethod) return null

              return {
                methodName: paymentMethod.name,
                type: paymentMethod.type,
                walletAddress:
                  paymentMethod.type === 'crypto_wallet' ? paymentMethod.walletAddress : undefined,
                currency:
                  paymentMethod.type === 'crypto_wallet' ? paymentMethod.currency : undefined,
                network: paymentMethod.type === 'crypto_wallet' ? paymentMethod.network : undefined,
                bankName:
                  paymentMethod.type === 'bank_transfer' ? paymentMethod.bankName : undefined,
                accountNumber:
                  paymentMethod.type === 'bank_transfer' ? paymentMethod.accountNumber : undefined,
                iban: paymentMethod.type === 'bank_transfer' ? paymentMethod.iban : undefined,
                swift: paymentMethod.type === 'bank_transfer' ? paymentMethod.swift : undefined,
                routingNumber:
                  paymentMethod.type === 'bank_transfer' ? paymentMethod.routingNumber : undefined,
                instructions: paymentMethod.instructions,
              }
            })
            .filter((method): method is NonNullable<typeof method> => method !== null)
        : undefined,
  }
}

/** Convertit les données pour le template PDF Quote */
export function convertToQuotePDFData(
  quote: Quote,
  client: Client,
  company?: Company
): PDFQuoteData {
  return {
    documentNumber: quote.documentNumber || quote._id,
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    status: quote.status,
    currency: quote.currency,
    subtotal: quote.subtotal,
    taxAmount: quote.taxAmount,
    total: quote.total,
    billingType: quote.billingType || 'itemized',
    items: quote.items.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })),
    description: quote.description,
    flatRateAmount: quote.flatRateAmount,
    client: {
      clientName: client.clientName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      country: client.country,
      contactPersonName: client.contactPersonName,
      contactPersonEmail: client.contactPersonEmail,
      contactPersonPhone: client.contactPersonPhone,
      contactPersonTitle: client.contactPersonTitle,
    },
    company: company
      ? {
          companyName: company.companyName,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          country: company.country,
        }
      : undefined,
    notes: quote.notes,
    terms: quote.terms,
  }
}

/** Convertit les données pour le template PDF Receipt */
export function convertToReceiptPDFData(
  receipt: Receipt,
  client: Client,
  company?: Company
): PDFReceiptData {
  return {
    documentNumber: receipt.documentNumber || receipt._id,
    createdAt: receipt.createdAt,
    paymentDate: receipt.paymentDate,
    status: receipt.status,
    currency: receipt.currency,
    subtotal: receipt.subtotal,
    taxAmount: receipt.taxAmount,
    total: receipt.total,
    billingType: receipt.billingType || 'itemized',
    items: receipt.items.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })),
    description: receipt.description,
    flatRateAmount: receipt.flatRateAmount,
    client: {
      clientName: client.clientName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      country: client.country,
      contactPersonName: client.contactPersonName,
      contactPersonEmail: client.contactPersonEmail,
      contactPersonPhone: client.contactPersonPhone,
      contactPersonTitle: client.contactPersonTitle,
    },
    company: company
      ? {
          companyName: company.companyName,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          country: company.country,
        }
      : undefined,
    notes: receipt.notes,
    invoiceReference: receipt.invoiceId ? `INV-${receipt.invoiceId}` : undefined,
  }
}
