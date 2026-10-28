'use client'

import { Button, Div, H2, P, Section, Strong } from '@ezstart/ui/components'
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
                  <th scope="col" className="p-4 text-left border-b-2 border-border">
                    {t('competitive.headers.feature')}
                  </th>
                  <th
                    scope="col"
                    className="p-4 text-left border-b-2 border-gp-primary bg-gp-primary/10"
                  >
                    <Strong className="text-gp-primary">
                      {t('competitive.headers.greenpulse')}
                    </Strong>
                  </th>
                  <th scope="col" className="p-4 text-left border-b-2 border-border">
                    {t('competitive.headers.software')}
                  </th>
                  <th scope="col" className="p-4 text-left border-b-2 border-border">
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
                      <th scope="row" className="p-4 text-left font-medium text-muted-foreground">
                        {row.feature}
                      </th>
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
    </>
  )
}
