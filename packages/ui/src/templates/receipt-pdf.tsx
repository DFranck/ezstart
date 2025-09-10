import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

// Logo EZStart en base64 (version simple pour démonstration)
const EZSTART_LOGO_BASE64 =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzQ4NjZGRiIvPgo8dGV4dCB4PSIxNiIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FWjwvdGV4dD4KICA8L3N2Zz4='

// Types pour le PDF Receipt
export interface PDFReceiptData {
  documentNumber: string
  createdAt: string
  paymentDate?: string
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
  invoiceReference?: string // Reference to original invoice
}

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    fontSize: 11,
    paddingTop: 30,
    paddingLeft: 60,
    paddingRight: 60,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 10,
  },
  receiptInfo: {
    alignItems: 'flex-end',
  },
  documentNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  date: {
    fontSize: 10,
    color: '#666',
    marginBottom: 3,
  },
  status: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#10B981',
    color: 'white',
    padding: 4,
    borderRadius: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  addressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  addressBlock: {
    width: '45%',
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  addressText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#6B7280',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    backgroundColor: '#F9FAFB',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  tableCellHeader: {
    margin: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableCell: {
    margin: 8,
    fontSize: 10,
    color: '#6B7280',
  },
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#4F46E5',
    marginTop: 5,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  notesSection: {
    marginTop: 30,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  notesText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
  },
})

interface ReceiptPDFProps {
  data: PDFReceiptData
}

export const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>RECEIPT</Text>
          <Text style={styles.documentNumber}>#{data.documentNumber}</Text>
        </View>
        <View style={styles.receiptInfo}>
          <Text style={styles.date}>
            Issued: {new Date(data.createdAt).toLocaleDateString()}
          </Text>
          {data.paymentDate && (
            <Text style={styles.date}>
              Payment Date: {new Date(data.paymentDate).toLocaleDateString()}
            </Text>
          )}
          {data.invoiceReference && (
            <Text style={styles.date}>
              For Invoice: {data.invoiceReference}
            </Text>
          )}
          <Text style={{
            fontSize: 10,
            fontWeight: 'bold',
            backgroundColor: '#10B981',
            color: 'white',
            padding: 4,
            borderRadius: 4,
            textAlign: 'center',
            textTransform: 'uppercase',
          }}>
            {data.status}
          </Text>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.addressSection}>
        {/* Company Info */}
        <View style={styles.addressBlock}>
          <Text style={styles.addressTitle}>FROM</Text>
          {data.company ? (
            <View>
              <Text style={styles.addressText}>{data.company.companyName}</Text>
              {data.company.address && (
                <Text style={styles.addressText}>{data.company.address}</Text>
              )}
              {(data.company.city || data.company.country) && (
                <Text style={styles.addressText}>
                  {[data.company.city, data.company.country].filter(Boolean).join(', ')}
                </Text>
              )}
              {data.company.email && (
                <Text style={styles.addressText}>{data.company.email}</Text>
              )}
              {data.company.phone && (
                <Text style={styles.addressText}>{data.company.phone}</Text>
              )}
              {data.company.taxNumber && (
                <Text style={styles.addressText}>Tax: {data.company.taxNumber}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.addressText}>Personal Receipt</Text>
          )}
        </View>

        {/* Client Info */}
        <View style={styles.addressBlock}>
          <Text style={styles.addressTitle}>TO</Text>
          <View>
            <Text style={styles.addressText}>{data.client.clientName}</Text>
            
            {/* Contact Person Info - Priority over company contact info */}
            {data.client.contactPersonName && (
              <>
                <Text style={styles.addressText}>{data.client.contactPersonName}</Text>
                {data.client.contactPersonTitle && (
                  <Text style={styles.addressText}>{data.client.contactPersonTitle}</Text>
                )}
              </>
            )}
            
            {data.client.address && (
              <Text style={styles.addressText}>{data.client.address}</Text>
            )}
            {(data.client.city || data.client.country) && (
              <Text style={styles.addressText}>
                {[data.client.city, data.client.country].filter(Boolean).join(', ')}
              </Text>
            )}
            
            {/* Use contact person email/phone if available, otherwise use company info */}
            {(data.client.contactPersonEmail || data.client.email) && (
              <Text style={styles.addressText}>
                {data.client.contactPersonEmail || data.client.email}
              </Text>
            )}
            {(data.client.contactPersonPhone || data.client.phone) && (
              <Text style={styles.addressText}>
                {data.client.contactPersonPhone || data.client.phone}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>Description</Text>
          </View>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>Quantity</Text>
          </View>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>Unit Price</Text>
          </View>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>Total</Text>
          </View>
        </View>

        {/* Table Rows */}
        {data.items.map((item, index) => (
          <View style={styles.tableRow} key={index}>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{item.label}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{item.quantity}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>
                {item.price.toFixed(2)} {data.currency}
              </Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>
                {(item.quantity * item.price).toFixed(2)} {data.currency}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Totals Section */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>
            {data.subtotal.toFixed(2)} {data.currency}
          </Text>
        </View>
        {data.taxAmount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>
              {data.taxAmount.toFixed(2)} {data.currency}
            </Text>
          </View>
        )}
        <View style={styles.grandTotal}>
          <Text style={styles.grandTotalLabel}>TOTAL PAID:</Text>
          <Text style={styles.grandTotalValue}>
            {data.total.toFixed(2)} {data.currency}
          </Text>
        </View>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesText}>{data.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Thank you for your payment! This receipt was generated on{' '}
        {new Date().toLocaleDateString()} by EZStart.
      </Text>
    </Page>
  </Document>
)