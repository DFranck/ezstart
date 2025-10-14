'use client'

import { Client } from '@ezbill/types'
import { Button, Card, CardContent, CardHeader, H1, Icon, P } from '@ezstart/ui/components'
import Link from 'next/link'

interface ClientHeaderProps {
  client: Client
  onCreateQuote: () => void
  onCreateInvoice: () => void
}

export function ClientHeader({ client, onCreateQuote, onCreateInvoice }: ClientHeaderProps) {
  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 w-full">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors mb-4 group"
      >
        <Icon
          name="lucide:ArrowLeft"
          className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform"
        />
        Back to Dashboard
      </Link>

      <Card variant={'ghost'}>
        {/* Client Info */}
        <CardHeader className="flex-1">
          <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
            <div
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                client.isCompany
                  ? 'bg-gradient-to-r from-accent to-accent/80'
                  : 'bg-gradient-to-r from-primary to-primary/80'
              }`}
            >
              <Icon
                name={client.isCompany ? 'lucide:Building' : 'lucide:User'}
                className="w-6 h-6 sm:w-8 sm:h-8 text-white"
              />
            </div>
            <div>
              <H1 size={'h3'}>{client.clientName}</H1>
              <div className="flex items-center space-x-2 mt-1">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    client.isCompany
                      ? 'bg-accent/10 text-accent'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Icon
                    name={client.isCompany ? 'lucide:Building2' : 'lucide:User'}
                    className="w-3 h-3 mr-1"
                  />
                  {client.isCompany ? 'Company' : 'Individual'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {client.email && (
              <div className="flex items-center text-sm text-foreground/60  backdrop-blur-sm ">
                <Icon name="lucide:Mail" className="w-4 h-4 mr-2 " />
                <a
                  href={`mailto:${client.email}`}
                  className="hover:text-primary transition-colors"
                >
                  {client.email}
                </a>
              </div>
            )}

            {client.phone && (
              <div className="flex items-center text-sm text-foreground/60  backdrop-blur-sm ">
                <Icon name="lucide:Phone" className="w-4 h-4 mr-2 " />
                <a href={`tel:${client.phone}`} className="hover:text-primary transition-colors">
                  {client.phone}
                </a>
              </div>
            )}

            {client.address && (
              <div className="flex items-center text-sm text-foreground/60  backdrop-blur-sm ">
                <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 " />
                <P>
                  {client.address && <span>{client.address}</span>}
                  {client.city && client.country && (
                    <span>
                      {client.city}, {client.country}
                    </span>
                  )}
                </P>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Action Buttons */}
        <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            onClick={onCreateQuote}
            className="bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white font-medium px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            <Icon name="lucide:FileText" className="w-4 h-4 sm:mr-2" />
            <span className="ml-2 sm:ml-0">New Quote</span>
          </Button>
          <Button
            onClick={onCreateInvoice}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            <Icon name="lucide:FileEdit" className="w-4 h-4 sm:mr-2" />
            <span className="ml-2 sm:ml-0">New Invoice</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
