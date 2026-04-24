'use client'

import {
  Button,
  Div,
  H2,
  H3,
  Icon,
  KnownIconName,
  P,
  Section,
  Strong,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function CompetitiveSection() {
  const t = useTranslations('home')

  return (
    <>
      {/* Competitive Advantage Section */}
      <Section size={'xl'} id="competitive-advantage">
        <Div className="container mx-auto">
          <H2 size="h3" className="text-center mb-12">
            {t('competitive.title')}
          </H2>

          <Div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="p-4 text-left border-b-2 border-border">
                    {t('competitive.headers.feature')}
                  </th>
                  <th className="p-4 text-left border-b-2 border-gp-primary bg-gp-primary/10">
                    <Strong className="text-gp-primary">
                      {t('competitive.headers.greenpulse')}
                    </Strong>
                  </th>
                  <th className="p-4 text-left border-b-2 border-border">
                    {t('competitive.headers.software')}
                  </th>
                  <th className="p-4 text-left border-b-2 border-border">
                    {t('competitive.headers.ai')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(t.raw('competitive.rows')) ? t.raw('competitive.rows') : []).map(
                  (
                    row: {
                      feature: string
                      greenpulse: string
                      software: string
                      ai: string
                    },
                    index: number
                  ) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4 font-medium text-muted-foreground">{row.feature}</td>
                      <td className="p-4 bg-gp-primary/5 font-semibold text-gp-primary">
                        {row.greenpulse}
                      </td>
                      <td className="p-4">{row.software}</td>
                      <td className="p-4">{row.ai}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </Div>

          <Div className="text-center">
            <P className="text-lg mb-6">{t('competitive.ctaSubtitle')}</P>
            <Button asChild size="lg" className="bg-gp-primary hover:bg-gp-primary/80">
              <Link href="/chat" target="_blank" rel="noopener noreferrer">
                {t('competitive.cta')}
              </Link>
            </Button>
          </Div>
        </Div>
      </Section>

      {/* Packages Section */}
      <Section size="full" id="pricing">
        <Div className="container mx-auto">
          <H3 className="text-4xl font-bold text-center ">{t('packages.title')}</H3>

          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Free Package */}
            <Div className="p-8 border-2 border-border hover:shadow-lg transition-all duration-300 rounded-lg">
              <Div className="mb-6">
                <H3 className="text-2xl font-bold mb-2 text-foreground">
                  {t('packages.free.title')}
                </H3>
                <P className="text-sm text-muted-foreground">{t('packages.free.subtitle')}</P>
              </Div>

              <P className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {t('packages.free.description')}
              </P>

              <Div className="space-y-3 mb-6">
                {Object.entries(t.raw('packages.free.features') as Record<string, string>).map(
                  ([key, feature]) => (
                    <Div key={key} className="flex items-start space-x-3">
                      <Icon
                        name="lucide:Check"
                        className="w-5 h-5 text-gp-primary flex-shrink-0 mt-0.5"
                      />
                      <P className={`text-sm ${key === 'instant' ? 'font-semibold' : ''}`}>
                        {feature}
                      </P>
                    </Div>
                  )
                )}
              </Div>

              <Button asChild className="w-full bg-gp-primary hover:bg-gp-primary/90 text-white">
                <Link href="/chat">{t('packages.free.cta')}</Link>
              </Button>
            </Div>

            {/* Premium Package */}
            <Div className="p-8 border-2 border-primary/30 relative rounded-lg">
              <Div className="text-center mb-6">
                <Icon name="lucide:TrendingUp" className="w-12 h-12  mx-auto mb-4" />
                <H3 className="text-2xl font-bold text-foreground mb-2">
                  {t('packages.premium.title')}
                </H3>
                <P className="text-sm font-medium  uppercase tracking-wide">
                  {t('packages.premium.subtitle')}
                </P>
              </Div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t('packages.premium.description')}
              </P>

              <Div className="space-y-3 mb-6">
                {[
                  { icon: 'lucide:MessageCircle', text: t('packages.premium.features.chat') },
                  { icon: 'lucide:BarChart3', text: t('packages.premium.features.tools') },
                  { icon: 'lucide:Upload', text: t('packages.premium.features.import') },
                  { icon: 'lucide:PieChart', text: t('packages.premium.features.analysis') },
                  { icon: 'lucide:ClipboardList', text: t('packages.premium.features.plans') },
                ].map((item, index) => (
                  <Div key={index} className="flex items-center space-x-3">
                    <Icon name={item.icon as KnownIconName} className="w-5 h-5 " />
                    <P className="text-sm">{item.text}</P>
                  </Div>
                ))}
              </Div>

              <Button asChild className="w-full" variant="outline">
                <a href="mailto:aseradni@nexora-venture.com?subject=Premium%20Package%20Inquiry">
                  {t('packages.contactUs')}
                </a>
              </Button>
            </Div>

            {/* Golden Package */}
            <Div className="p-8 border-2 border-amber-300 rounded-lg">
              <Div className="text-center mb-6">
                <Icon name="lucide:Award" className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <H3 className="text-2xl font-bold text-foreground mb-2">
                  {t('packages.golden.title')}
                </H3>
                <P className="text-sm font-medium text-amber-600 uppercase tracking-wide">
                  {t('packages.golden.subtitle')}
                </P>
              </Div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t('packages.golden.description')}
              </P>

              <Div className="space-y-3 mb-6">
                {[
                  { icon: 'lucide:Star', text: t('packages.golden.features.all') },
                  {
                    icon: 'lucide:Handshake',
                    text: t('packages.golden.features.support'),
                  },
                  { icon: 'lucide:UserCheck', text: t('packages.golden.features.replace') },
                ].map((item, index) => (
                  <Div key={index} className="flex items-center space-x-3">
                    <Icon name={item.icon as KnownIconName} className="w-5 h-5 text-amber-500" />
                    <P className="text-sm">{item.text}</P>
                  </Div>
                ))}
              </Div>

              <Button asChild className="w-full" variant="outline">
                <a href="mailto:aseradni@nexora-venture.com?subject=Golden%20Package%20Inquiry">
                  {t('packages.contactUs')}
                </a>
              </Button>
            </Div>
          </Div>
        </Div>
      </Section>

      {/* Bottom CTA Section */}
      <Section size={'xl'} className="max-w-full t">
        <Div className="container mx-auto text-center">
          <Div className="max-w-3xl mx-auto">
            <H3 className="text-3xl lg:text-4xl font-bold mb-6">{t('cta.title')}</H3>
            <P className="text-xl mb-8">{t('cta.description')}</P>
            <Button
              asChild
              size="lg"
              className="bg-gp-primary hover:bg-gp-primary/80 text-lg px-8 py-6"
            >
              <Link href="/chat" target="_blank" rel="noopener noreferrer">
                {t('cta.getStarted')}
              </Link>
            </Button>
          </Div>
        </Div>
      </Section>
    </>
  )
}
