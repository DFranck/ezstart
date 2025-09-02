import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

// Logo EZStart en base64 (version simple pour démonstration)
const EZSTART_LOGO_BASE64 =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzQ4NjZGRiIvPgo8dGV4dCB4PSIxNiIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FWjwvdGV4dD4KICA8L3N2Zz4='

// Types simplifiés pour le PDF (pour éviter les dépendances circulaires)
interface PDFInvoiceData {
  documentNumber: string
  createdAt: string
  dueDate?: string
  status: string
  currency: string
  subtotal: number
  taxAmount: number
  total: number
  items: Array<{
    label: string
    quantity: number
    price: number
  }>
  client: {
    clientName: string
    email?: string
    phone?: string
    address?: string
    city?: string
    country?: string
    postalCode?: string
  }
  company?: {
    companyName: string
    email?: string
    phone?: string
    address?: string
    city?: string
    country?: string
    postalCode?: string
    taxNumber?: string
  }
  notes?: string
  terms?: string
  paymentDetails?: {
    methodName?: string
    type?: string
    // Crypto fields
    walletAddress?: string
    currency?: string
    network?: string
    // Bank fields
    bankName?: string
    accountNumber?: string
    iban?: string
    swift?: string
    routingNumber?: string
    // Digital payment fields
    email?: string
    username?: string
    // General
    instructions?: string
  }
}

// Styles PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  brandText: {
    fontSize: 10,
    color: '#4f46e5',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
    marginTop: 20,
  },
  text: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 4,
  },
  billToSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  billToBox: {
    flex: 1,
    marginRight: 20,
  },
  table: {
    marginTop: 20,
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    padding: 10,
    borderBottom: '1px solid #e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: '1px solid #f7fafc',
  },
  tableColDescription: {
    flex: 3,
    fontSize: 12,
    color: '#2d3748',
  },
  tableColQuantity: {
    flex: 1,
    fontSize: 12,
    color: '#2d3748',
    textAlign: 'center',
  },
  tableColPrice: {
    flex: 1,
    fontSize: 12,
    color: '#2d3748',
    textAlign: 'right',
  },
  tableColTotal: {
    flex: 1,
    fontSize: 12,
    color: '#2d3748',
    textAlign: 'right',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: 250,
    marginTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottom: '1px solid #f7fafc',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: '2px solid #4299e1',
    backgroundColor: '#ebf8ff',
    marginTop: 5,
    paddingHorizontal: 10,
  },
  totalLabel: {
    fontSize: 12,
    color: '#4a5568',
  },
  totalValue: {
    fontSize: 12,
    color: '#2d3748',
    fontWeight: 'bold',
  },
  totalFinal: {
    fontSize: 16,
    color: '#1a202c',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: 10,
    color: '#718096',
    marginBottom: 4,
  },
  paymentSection: {
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    border: '1px solid #e0f2fe',
    flex: 1,
    marginRight: 10,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 3,
  },
  walletAddress: {
    fontSize: 8,
    color: '#6b7280',
    fontFamily: 'Courier',
    backgroundColor: '#f9fafb',
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
    wordBreak: 'break-all',
    textAlign: 'left',
    lineHeight: 1.2,
    border: '1px dashed #d1d5db',
  },
  footerGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 15,
  },
  notesTermsSection: {
    flex: 1,
    marginLeft: 10,
  },
  compactSection: {
    marginBottom: 8,
  },
  compactSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 3,
  },
  compactText: {
    fontSize: 9,
    color: '#4a5568',
    lineHeight: 1.3,
  },
  paymentHint: {
    fontSize: 7,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 2,
  },
})

interface InvoicePDFProps {
  data: PDFInvoiceData
}

export function InvoicePDF({ data }: InvoicePDFProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US')
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} ${data.currency}`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.subtitle}>#{data.documentNumber}</Text>
            <Text style={styles.text}>Date: {formatDate(data.createdAt)}</Text>
            {data.dueDate && <Text style={styles.text}>Due Date: {formatDate(data.dueDate)}</Text>}
          </View>
          {/* <View style={styles.headerRight}>
            <Text style={styles.text}>Status: {data.status.toUpperCase()}</Text>
          </View> */}
        </View>

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <View style={styles.billToBox}>
            <Text style={styles.sectionTitle}>BILL TO</Text>
            <Text style={styles.text}>{data.client.clientName}</Text>
            {data.client.email && <Text style={styles.text}>{data.client.email}</Text>}
            {data.client.phone && <Text style={styles.text}>{data.client.phone}</Text>}
            {data.client.address && <Text style={styles.text}>{data.client.address}</Text>}
            {(data.client.city || data.client.postalCode || data.client.country) && (
              <Text style={styles.text}>
                {[data.client.city, data.client.postalCode, data.client.country]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            )}
          </View>

          {data.company && (
            <View style={styles.billToBox}>
              <Text style={styles.sectionTitle}>FROM</Text>
              <Text style={styles.text}>{data.company.companyName}</Text>
              {data.company.taxNumber && (
                <Text style={styles.text}>Tax ID: {data.company.taxNumber}</Text>
              )}
              {data.company.email && <Text style={styles.text}>{data.company.email}</Text>}
              {data.company.phone && <Text style={styles.text}>{data.company.phone}</Text>}
              {data.company.address && <Text style={styles.text}>{data.company.address}</Text>}
              {(data.company.city || data.company.postalCode || data.company.country) && (
                <Text style={styles.text}>
                  {[data.company.city, data.company.postalCode, data.company.country]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColDescription}>Description</Text>
            <Text style={styles.tableColQuantity}>Qty</Text>
            <Text style={styles.tableColPrice}>Unit Price</Text>
            <Text style={styles.tableColTotal}>Total</Text>
          </View>

          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableColDescription}>{item.label}</Text>
              <Text style={styles.tableColQuantity}>{item.quantity}</Text>
              <Text style={styles.tableColPrice}>{formatCurrency(item.price)}</Text>
              <Text style={styles.tableColTotal}>{formatCurrency(item.quantity * item.price)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
          </View>

          {data.taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.taxAmount)}</Text>
            </View>
          )}

          <View style={styles.totalRowFinal}>
            <Text style={styles.totalFinal}>TOTAL:</Text>
            <Text style={styles.totalFinal}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Compact Layout: Payment + Notes/Terms */}
          <View style={styles.footerGrid}>
            {/* Payment Details Section */}
            {data.paymentDetails && (
              <View style={styles.paymentSection}>
                <Text style={styles.paymentTitle}>
                  💳 {data.paymentDetails.methodName || 'Payment Details'}
                </Text>

                {/* Crypto Wallet */}
                {data.paymentDetails.type === 'crypto_wallet' &&
                  data.paymentDetails.walletAddress && (
                    <>
                      <Text style={styles.paymentText}>
                        {data.paymentDetails.currency || 'USDC'} •{' '}
                        {data.paymentDetails.network || 'Blockchain'}
                      </Text>
                      <Text style={styles.paymentText}>Wallet Address:</Text>
                      <Text style={styles.walletAddress}>{data.paymentDetails.walletAddress}</Text>
                      <Text style={styles.paymentHint}>
                        Copy the entire address above for payment
                      </Text>
                    </>
                  )}

                {/* Bank Transfer */}
                {data.paymentDetails.type === 'bank_transfer' && (
                  <>
                    {data.paymentDetails.bankName && (
                      <Text style={styles.paymentText}>{data.paymentDetails.bankName}</Text>
                    )}
                    {data.paymentDetails.iban && (
                      <Text style={styles.paymentText}>IBAN: {data.paymentDetails.iban}</Text>
                    )}
                    {data.paymentDetails.swift && (
                      <Text style={styles.paymentText}>SWIFT: {data.paymentDetails.swift}</Text>
                    )}
                  </>
                )}

                {/* Digital Payments */}
                {['paypal', 'wise', 'revolut'].includes(data.paymentDetails.type || '') && (
                  <>
                    {data.paymentDetails.email && (
                      <Text style={styles.paymentText}>{data.paymentDetails.email}</Text>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Notes and Terms in compact format */}
            <View style={styles.notesTermsSection}>
              {data.notes && (
                <View style={styles.compactSection}>
                  <Text style={styles.compactSectionTitle}>Notes</Text>
                  <Text style={styles.compactText}>{data.notes}</Text>
                </View>
              )}

              {data.terms && (
                <View style={styles.compactSection}>
                  <Text style={styles.compactSectionTitle}>Terms</Text>
                  <Text style={styles.compactText}>{data.terms}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.brandSection}>
            <Image style={styles.logo} src={EZSTART_LOGO_BASE64} />
            <Text style={styles.brandText}>Generated by EZStart Billing</Text>
            <Text style={styles.footerText}> • {formatDate(new Date().toISOString())}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export type { PDFInvoiceData }
