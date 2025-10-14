/**
 * EXEMPLE - Comment utiliser CollapsibleGroup pour grouper les invoices
 *
 * Remplace la section Invoices actuelle (lignes 142-184 de page.tsx) par ceci :
 */

import CollapsibleGroup from '@/components/CollapsibleGroup'
import { InvoiceCard } from '@/components/DocumentCard'
import DashboardSection from '@/components/DashboardSection'
import { groupInvoicesByMonth, groupInvoicesByWeek, groupInvoicesByStatus } from '@/utils/group-invoices'
import { Button, Icon } from '@ezstart/ui/components'
import { useState } from 'react'

// Dans ton composant ClientDashboardPage :

export function InvoicesSection({ clientInvoices, handlers, handleCreateInvoice, handleEditInvoice, handleMarkPaid, openPreview, getBillingPermissions }: any) {
  // State pour choisir le type de grouping
  const [groupBy, setGroupBy] = useState<'month' | 'week' | 'status'>('month')

  // Grouper les invoices selon le choix
  const invoiceGroups =
    groupBy === 'month' ? groupInvoicesByMonth(clientInvoices) :
    groupBy === 'week' ? groupInvoicesByWeek(clientInvoices) :
    groupInvoicesByStatus(clientInvoices)

  return (
    <DashboardSection
      title="Invoices"
      description={`${clientInvoices.length} total invoices`}
      icon="lucide:FileEdit"
      iconGradient="bg-gradient-invoice"
      onAdd={handleCreateInvoice}
      addButtonText="Create Invoice"
      addButtonIcon="lucide:Plus"
      addButtonGradient="bg-gradient-invoice hover:bg-gradient-invoice-hover"
      isEmpty={clientInvoices.length === 0}
      emptyState={{
        icon: 'lucide:FileEdit',
        iconBg: 'bg-gradient-invoice-light text-ezbill-invoice',
        title: 'No invoices yet',
        description: 'Create your first invoice to get started',
        buttonText: 'Create First Invoice',
      }}
    >
      {clientInvoices.length > 0 && (
        <div className="space-y-4">
          {/* Group By Selector */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={groupBy === 'month' ? 'default' : 'outline'}
              onClick={() => setGroupBy('month')}
            >
              <Icon name="lucide:Calendar" className="w-4 h-4 mr-2" />
              By Month
            </Button>
            <Button
              size="sm"
              variant={groupBy === 'week' ? 'default' : 'outline'}
              onClick={() => setGroupBy('week')}
            >
              <Icon name="lucide:CalendarDays" className="w-4 h-4 mr-2" />
              By Week
            </Button>
            <Button
              size="sm"
              variant={groupBy === 'status' ? 'default' : 'outline'}
              onClick={() => setGroupBy('status')}
            >
              <Icon name="lucide:Tag" className="w-4 h-4 mr-2" />
              By Status
            </Button>
          </div>

          {/* Collapsible Groups */}
          <CollapsibleGroup
            groups={invoiceGroups}
            renderItem={(invoice) => {
              const permissions = getBillingPermissions(invoice, 'invoice')
              return (
                <InvoiceCard
                  key={invoice._id}
                  documentNumber={invoice.documentNumber}
                  status={invoice.status}
                  createdAt={invoice.createdAt}
                  total={invoice.total}
                  currency={invoice.currency}
                  permissions={permissions}
                  onClick={() => openPreview('invoice', invoice)}
                  onEdit={e => handleEditInvoice(invoice, e)}
                  onSend={e => handlers.handleSendInvoice(invoice, e)}
                  onDownload={e => handlers.handleDownloadInvoice(invoice, e)}
                  onDownloadReceipt={e => handlers.handleDownloadReceiptByInvoice(invoice, e)}
                  onMarkPaid={e => handleMarkPaid(invoice, e)}
                />
              )
            }}
            defaultOpenAll={false}  // Commence avec tout fermé
            showToggleAll={true}     // Affiche le bouton "Expand/Collapse All"
            emptyMessage="No invoices found"
          />
        </div>
      )}
    </DashboardSection>
  )
}

/**
 * RÉSULTAT VISUEL :
 *
 * Invoices
 * 12 total invoices                                [Create Invoice]
 *
 * [By Month] [By Week] [By Status]                [Expand All]
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ > January 2025 (ce mois)                      4 items    │
 * └──────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ ∨ December 2024                               5 items    │
 * │   ┌────────────────────────────────────────────────────┐ │
 * │   │ #INV-2024-0011  paid   15/12/2024  $1120 USD      │ │
 * │   │                         Download   Receipt         │ │
 * │   └────────────────────────────────────────────────────┘ │
 * │   ┌────────────────────────────────────────────────────┐ │
 * │   │ #INV-2024-0010  paid   10/12/2024  $800 USD       │ │
 * │   └────────────────────────────────────────────────────┘ │
 * │   ...                                                    │
 * └──────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ > November 2024                               3 items    │
 * └──────────────────────────────────────────────────────────┘
 *
 */

/**
 * AVANTAGES :
 *
 * ✅ Liste compacte : Au lieu de voir 50 invoices, tu vois 3-4 groupes
 * ✅ Navigation rapide : Clique sur un mois pour voir ses invoices
 * ✅ Flexibilité : Groupe par mois, semaine, ou statut
 * ✅ Toggle All : Ouvre/ferme tous les groupes en un clic
 * ✅ Indicateurs : "ce mois", "cette semaine" pour s'y retrouver
 * ✅ Tri automatique : Plus récent en premier dans chaque groupe
 *
 * POUR APPLIQUER :
 *
 * 1. Remplace le contenu de DashboardSection Invoices par ce code
 * 2. Importe les dépendances nécessaires
 * 3. Fais pareil pour Quotes et Receipts si besoin
 */
