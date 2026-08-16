'use client'

import ClientLayout from '@/components/ClientLayout'
import { EZAuthLoginSection } from '@/components/ezauth-login-section'
import { Card, CardContent, CardHeader, H1, H2, H3, Icon, P, Div } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function HomePage() {
  const t = useTranslations('home')

  return (
    <ClientLayout>
      {/* Hero Section */}
      <Div className="text-center mb-8">
        {/* Logo */}
        <Card className="mt-8 mb-4 md:mb-8" variant="ghost">
          <CardHeader className="flex items-center justify-center gap-2">
            <Icon name="custom:Ezbill" size={24} className="md:hidden" />
            <Icon name="custom:Ezbill" size={32} className="hidden md:flex" />
            <H1 className="bg-gradient-to-r from-ezbill-client to-ezbill-invoice bg-clip-text text-transparent w-fit">
              EZBill
            </H1>
          </CardHeader>
          <CardContent>
            <P className="max-w-2xl mx-auto">{t('description')}</P>
          </CardContent>
        </Card>

        {/* Features */}
        <Div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8  max-w-4xl mx-auto">
          <Card variant={'floating'}>
            <CardContent>
              <Div className="w-12 h-12 bg-gradient-company rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="lucide:FileText" className="w-6 h-6 text-primary-foreground" />
              </Div>
              <H3 size={'h4'}>{t('smartInvoicing')}</H3>
              <P>{t('smartInvoicingDesc')}</P>
            </CardContent>
          </Card>

          <Card variant="floating">
            <CardContent>
              <Div className="w-12 h-12 bg-gradient-client rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="lucide:Users" className="w-6 h-6 text-primary-foreground" />
              </Div>
              <H3 size={'h4'}>{t('clientManagement')}</H3>
              <P>{t('clientManagementDesc')}</P>
            </CardContent>
          </Card>

          <Card variant="floating">
            <CardContent>
              <Div className="w-12 h-12 bg-gradient-payment rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="lucide:TrendingUp" className="w-6 h-6 text-primary-foreground" />
              </Div>
              <H3 size={'h4'}>{t('paymentTracking')}</H3>
              <P>{t('paymentTrackingDesc')}</P>
            </CardContent>
          </Card>
        </Div>
      </Div>

      {/* Login Section */}
      <Card id="login" variant="ghost" className="w-full max-w-md">
        <CardHeader>
          <H2>{t('getStarted')}</H2>
        </CardHeader>
        <CardContent>
          <EZAuthLoginSection />
        </CardContent>
      </Card>
    </ClientLayout>
  )
}
