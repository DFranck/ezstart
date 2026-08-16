import { Button, Div, H2, H3, Icon, Main, P, Section, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

type LegalSection = {
  id: string
  title: string
  content: string
  link?: { label: string; href: string }
}

const icons: Record<string, React.ReactNode> = {
  editor: <Icon name="fa:FaUserShield" className="text-primary" size={20} />,
  hosting: <Icon name="fa:FaServer" className="text-secondary" size={20} />,
  intellectualProperty: <Icon name="fa:FaBalanceScale" className="text-yellow-600" size={20} />,
  privacy: <Icon name="fa:FaUserSecret" className="text-green-600" size={20} />,
  contact: <Icon name="fa:FaEnvelope" className="text-blue-500" size={20} />,
}

const LegalNoticesPage = (): React.JSX.Element => {
  const t = useTranslations('legal-notices')
  const sections = t.raw('sections') as LegalSection[]

  return (
    <Main withHeaderOffset>
      <Section id="legal-notices" className="space-y-8">
        <Div className="max-w-4xl mx-auto text-center space-y-6">
          <H2>{t('title')}</H2>
          <P className="text-lg text-muted-foreground">{t('intro')}</P>
        </Div>

        {sections.map(section => (
          <Section key={section.id} role="region" aria-labelledby={section.id}>
            <Div className="flex items-center gap-3 mb-2">
              <Span>{icons[section.id] ?? <Icon name="fa:FaFile" size={20} />}</Span>
              <H3 id={section.id}>{section.title}</H3>
            </Div>
            {section.content
              .split('\n')
              .filter(Boolean)
              .map((line, i) => (
                <P
                  key={i}
                  className={line.includes('[À compléter]') ? 'text-orange-600 font-semibold' : ''}
                >
                  {line}
                </P>
              ))}
            {section.link && (
              <Button variant="outline" className="mt-2 w-fit">
                <Link
                  href={section.link.href}
                  target={section.link.href.startsWith('http') ? '_blank' : undefined}
                  className="underline underline-offset-2 font-semibold"
                >
                  {section.link.label}
                </Link>
              </Button>
            )}
          </Section>
        ))}
      </Section>
    </Main>
  )
}

export default LegalNoticesPage
