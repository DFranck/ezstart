'use client'

import { Client } from '@ezbill/types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  H1,
  Icon,
  P,
  Div,
  Span,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface ClientHeaderProps {
  client: Client
  onCreateQuote: () => void
  onCreateInvoice: () => void
}

export function ClientHeader({ client, onCreateQuote, onCreateInvoice }: ClientHeaderProps) {
  const tDashboard = useTranslations('dashboard')
  const tClient = useTranslations('client')
  return (
    <Div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 w-full">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-ezbill-client hover:text-ezbill-client/80 font-medium transition-colors mb-4 group"
      >
        <Icon
          name="lucide:ArrowLeft"
          className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform"
        />
        {tDashboard('backToDashboard')}
      </Link>

      <Card variant={'ghost'}>
        {/* Client Info */}
        <CardHeader className="flex-1">
          <Div className="flex items-center space-x-3 sm:space-x-4 mb-4">
            <Div
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                client.isCompany ? 'bg-gradient-company' : 'bg-gradient-client'
              }`}
            >
              <Icon
                name={client.isCompany ? 'lucide:Building' : 'lucide:User'}
                className={`w-6 h-6 sm:w-8 sm:h-8 ${client.isCompany ? 'text-ezbill-company-foreground' : 'text-ezbill-client-foreground'}`}
              />
            </Div>
            <Div>
              <H1 size={'h3'}>{client.clientName}</H1>
              <Div className="flex items-center space-x-2 mt-1">
                <Span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    client.isCompany
                      ? 'bg-ezbill-company/10 text-ezbill-company border border-ezbill-company/30'
                      : 'bg-ezbill-client/10 text-ezbill-client border border-ezbill-client/30'
                  }`}
                >
                  <Icon
                    name={client.isCompany ? 'lucide:Building2' : 'lucide:User'}
                    className="w-4 h-4 sm:w-3 sm:h-3 mr-1"
                  />
                  {client.isCompany ? tClient('company') : tClient('individual')}
                </Span>
              </Div>
            </Div>
          </Div>

          {/* Contact Info */}
          <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {client.email && (
              <Div className="flex items-center text-sm text-foreground/60  backdrop-blur-sm ">
                <Icon name="lucide:Mail" className="w-4 h-4 mr-2 " />
                <a
                  href={`mailto:${client.email}`}
                  className="hover:text-ezbill-client transition-colors"
                >
                  {client.email}
                </a>
              </Div>
            )}

            {client.phone && (
              <Div className="flex items-center text-sm text-foreground/60  backdrop-blur-sm ">
                <Icon name="lucide:Phone" className="w-4 h-4 mr-2 " />
                <a
                  href={`tel:${client.phone}`}
                  className="hover:text-ezbill-client transition-colors"
                >
                  {client.phone}
                </a>
              </Div>
            )}

            {client.address && (
              <Div className="flex items-center text-sm text-foreground/60  backdrop-blur-sm ">
                <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 " />
                <P>
                  {client.address && <Span>{client.address}</Span>}
                  {client.city && client.country && (
                    <Span>
                      {client.city}, {client.country}
                    </Span>
                  )}
                </P>
              </Div>
            )}
          </Div>
        </CardHeader>

        {/* Action Buttons */}
        <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            onClick={onCreateQuote}
            className="bg-gradient-quote hover:opacity-90 text-ezbill-quote-foreground font-medium px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            <Icon name="lucide:FileText" className="w-4 h-4 sm:mr-2" />
            <Span className="ml-2 sm:ml-0">{tDashboard('newQuote')}</Span>
          </Button>
          <Button
            onClick={onCreateInvoice}
            className="bg-gradient-invoice hover:opacity-90 text-ezbill-invoice-foreground font-medium px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            <Icon name="lucide:FileEdit" className="w-4 h-4 sm:mr-2" />
            <Span className="ml-2 sm:ml-0">{tDashboard('newInvoice')}</Span>
          </Button>
        </CardContent>
      </Card>
    </Div>
  )
}
