import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

// Register Roboto font family (supports Vietnamese characters)
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
      fontWeight: 300,
      fontStyle: 'normal',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-lightitalic-webfont.ttf',
      fontWeight: 300,
      fontStyle: 'italic',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
      fontWeight: 400,
      fontStyle: 'normal',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf',
      fontWeight: 400,
      fontStyle: 'italic',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf',
      fontWeight: 500,
      fontStyle: 'normal',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-mediumitalic-webfont.ttf',
      fontWeight: 500,
      fontStyle: 'italic',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 700,
      fontStyle: 'normal',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bolditalic-webfont.ttf',
      fontWeight: 700,
      fontStyle: 'italic',
    },
  ],
})

export interface PDFQuoteData {
  documentNumber: string
  createdAt: string
  validUntil?: string
  status: string
  currency: string
  subtotal: number
  taxAmount: number
  total: number
  billingType: 'itemized' | 'flat-rate'
  items: Array<{
    label: string
    quantity: number
    price: number
  }>
  description?: string
  flatRateAmount?: number
  client: {
    clientName: string
    email?: string
    phone?: string
    address?: string
    city?: string
    country?: string
    postalCode?: string
    contactPersonName?: string
    contactPersonEmail?: string
    contactPersonPhone?: string
    contactPersonTitle?: string
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
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 15,
    fontFamily: 'Roboto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 6,
    marginTop: 0,
  },
  text: {
    fontSize: 11,
    color: '#4a5568',
    marginBottom: 3,
  },
  billToSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billToBox: {
    flex: 1,
    marginRight: 20,
  },
  table: {
    marginTop: 10,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    padding: 8,
    borderBottom: '1px solid #e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
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
  flatRateSection: {
    marginTop: 10,
    marginBottom: 12,
  },
  flatRateHeader: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    padding: 8,
    borderBottom: '1px solid #e2e8f0',
  },
  flatRateRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #f7fafc',
  },
  flatRateDescription: {
    flex: 3,
    fontSize: 12,
    color: '#2d3748',
  },
  flatRateAmount: {
    flex: 1,
    fontSize: 12,
    color: '#2d3748',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: 250,
    marginTop: 10,
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
    marginTop: 15,
    paddingTop: 10,
    borderTop: '1px solid #e2e8f0',
  },
  footerGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 0,
    justifyContent: 'space-between',
  },
  notesTermsSection: {
    flex: 1,
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
})

interface QuotePDFProps {
  data: PDFQuoteData
}

export function QuotePDF({ data }: QuotePDFProps) {
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

  const formatDescription = (label: string) => {
    const parts = label.split('•').filter(p => p.trim())

    if (parts.length <= 1) {
      return <Text>{label}</Text>
    }

    const [title, ...bullets] = parts

    return (
      <View>
        <Text style={{ fontWeight: 500, marginBottom: 3 }}>{title?.trim() ?? ''}</Text>
        {bullets.map((bullet, idx) => (
          <Text key={idx} style={{ fontSize: 8, lineHeight: 1.4, marginLeft: 8, marginBottom: 1 }}>
            • {bullet.trim()}
          </Text>
        ))}
      </View>
    )
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>QUOTE</Text>
            <Text style={styles.subtitle}>#{data.documentNumber}</Text>
            <Text style={styles.text}>Date: {formatDate(data.createdAt)}</Text>
            {data.validUntil && (
              <Text style={styles.text}>Valid Until: {formatDate(data.validUntil)}</Text>
            )}
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <View style={styles.billToBox}>
            <Text style={styles.sectionTitle}>QUOTE FOR</Text>
            <Text style={styles.text}>{data.client.clientName}</Text>

            {data.client.contactPersonName && (
              <>
                <Text style={styles.text}>{data.client.contactPersonName}</Text>
                {data.client.contactPersonTitle && (
                  <Text style={styles.text}>{data.client.contactPersonTitle}</Text>
                )}
              </>
            )}

            {(data.client.contactPersonEmail || data.client.email) && (
              <Text style={styles.text}>{data.client.contactPersonEmail || data.client.email}</Text>
            )}
            {(data.client.contactPersonPhone || data.client.phone) && (
              <Text style={styles.text}>{data.client.contactPersonPhone || data.client.phone}</Text>
            )}

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

        {/* Items Section */}
        {data.billingType === 'flat-rate' ? (
          <View style={styles.flatRateSection}>
            <View style={styles.flatRateHeader}>
              <Text style={styles.tableColDescription}>Description</Text>
              <Text style={styles.tableColTotal}>Total</Text>
            </View>
            <View style={styles.flatRateRow} wrap={false}>
              <View style={styles.flatRateDescription}>
                {formatDescription(data.description || '')}
              </View>
              <Text style={styles.flatRateAmount}>{formatCurrency(data.flatRateAmount || 0)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableColDescription}>Description</Text>
              <Text style={styles.tableColQuantity}>Qty</Text>
              <Text style={styles.tableColPrice}>Unit Price</Text>
              <Text style={styles.tableColTotal}>Total</Text>
            </View>

            {data.items.map((item, index) => (
              <View key={index} style={styles.tableRow} wrap={false}>
                <View style={styles.tableColDescription}>{formatDescription(item.label)}</View>
                <Text style={styles.tableColQuantity}>{item.quantity}</Text>
                <Text style={styles.tableColPrice}>{formatCurrency(item.price)}</Text>
                <Text style={styles.tableColTotal}>
                  {formatCurrency(item.quantity * item.price)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection} wrap={false}>
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
        <View style={styles.footer} wrap={false}>
          <View style={styles.footerGrid}>
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
        </View>
      </Page>
    </Document>
  )
}
