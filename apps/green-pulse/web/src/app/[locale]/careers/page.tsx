'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  H3,
  Icon,
  P,
  Section,
  Span,
  Strong,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function CareersPage() {
  const t = useTranslations('careers')

  return (
    <>
      {/* Hero Section */}
      <Section size="xl" className="mt-20">
        <Div className="container mx-auto text-center max-w-4xl">
          <H1 size="h2" className="mb-6">
            {t('hero.title')}
          </H1>
          <P className="text-xl text-muted-foreground mb-6">{t('hero.subtitle')}</P>
          <P className="text-lg">{t('hero.description')}</P>
        </Div>
      </Section>

      {/* Current Openings */}
      <Section size="xl">
        <Div className="container mx-auto">
          <H2 size="h3" className="text-center mb-12">
            {t('openings.title')}
          </H2>

          {/* Job Opening Card */}
          <Card className="" variant={'ghost'}>
            <CardHeader>
              <Div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <Div>
                  <H3 size="h4" className="mb-2">
                    {t('bdRole.title')}
                  </H3>
                  <Span className="inline-block bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
                    {t('openings.badge')}
                  </Span>
                </Div>
              </Div>

              <Div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <Div className="flex items-center gap-2">
                  <Icon name="lucide:MapPin" size={16} />
                  <Span>{t('bdRole.location')}</Span>
                </Div>
                <Div className="flex items-center gap-2">
                  <Icon name="lucide:Briefcase" size={16} />
                  <Span>{t('bdRole.type')}</Span>
                </Div>
                <Div className="flex items-center gap-2">
                  <Icon name="lucide:Heart" size={16} />
                  <Span>{t('bdRole.mission')}</Span>
                </Div>
              </Div>

              <P className="text-base mb-4">{t('bdRole.summary')}</P>

              <Div className="flex flex-wrap gap-2">
                {(t.raw('bdRole.tags') as string[]).map((tag, index) => (
                  <Span
                    key={index}
                    className="bg-gp-primary/10 text-gp-primary border border-gp-primary px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </Span>
                ))}
              </Div>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* About the Role */}
              <Div>
                <H3 size="h5" className="mb-4 text-gp-primary">
                  {t('bdRole.sections.about.title')}
                </H3>
                <P className="leading-relaxed whitespace-pre-line">
                  {t('bdRole.sections.about.content')}
                </P>
              </Div>

              {/* What You'll Do */}
              <Div>
                <H3 size="h5" className="mb-4 text-gp-primary">
                  {t('bdRole.sections.responsibilities.title')}
                </H3>
                <Div className="space-y-6">
                  {(
                    t.raw('bdRole.sections.responsibilities.items') as Array<{
                      title: string
                      tasks: string[]
                    }>
                  ).map((item, index) => (
                    <Div key={index}>
                      <H3 size="h6" className="mb-2">
                        {item.title}
                      </H3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {item.tasks.map((task, taskIndex) => (
                          <li key={taskIndex}>{task}</li>
                        ))}
                      </ul>
                    </Div>
                  ))}
                </Div>
              </Div>

              {/* Who You Are */}
              <Div>
                <H3 size="h5" className="mb-4 text-gp-primary">
                  {t('bdRole.sections.requirements.title')}
                </H3>
                <Div className="space-y-4">
                  {/* Must Have */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.requirements.mustHave.title')}
                    </H3>
                    <ul className="list-disc list-inside space-y-2">
                      {(t.raw('bdRole.sections.requirements.mustHave.items') as string[]).map(
                        (item, index) => (
                          <li key={index} className="leading-relaxed">
                            <Span
                              dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                              }}
                            />
                          </li>
                        )
                      )}
                    </ul>
                  </Div>

                  {/* Ideal Background */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.requirements.idealBackground.title')}
                    </H3>
                    <ul className="list-disc list-inside space-y-2">
                      {(
                        t.raw('bdRole.sections.requirements.idealBackground.items') as string[]
                      ).map((item, index) => (
                        <li key={index} className="leading-relaxed">
                          <Span
                            dangerouslySetInnerHTML={{
                              __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </Div>

                  {/* NOT Required */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.requirements.notRequired.title')}
                    </H3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(t.raw('bdRole.sections.requirements.notRequired.items') as string[]).map(
                        (item, index) => (
                          <li key={index}>{item}</li>
                        )
                      )}
                    </ul>
                  </Div>
                </Div>
              </Div>

              {/* What We Offer */}
              <Div>
                <H3 size="h5" className="mb-4 text-gp-primary">
                  {t('bdRole.sections.offer.title')}
                </H3>
                <Div className="space-y-4">
                  {/* Compensation */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.offer.compensation.title')}
                    </H3>
                    <ul className="list-disc list-inside space-y-2">
                      {(t.raw('bdRole.sections.offer.compensation.items') as string[]).map(
                        (item, index) => (
                          <li key={index} className="leading-relaxed">
                            <Span
                              dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                              }}
                            />
                          </li>
                        )
                      )}
                    </ul>
                  </Div>

                  {/* Growth & Impact */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.offer.growth.title')}
                    </H3>
                    <ul className="list-disc list-inside space-y-2">
                      {(t.raw('bdRole.sections.offer.growth.items') as string[]).map(
                        (item, index) => (
                          <li key={index} className="leading-relaxed">
                            <Span
                              dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                              }}
                            />
                          </li>
                        )
                      )}
                    </ul>
                  </Div>

                  {/* Team Culture */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.offer.culture.title')}
                    </H3>
                    <ul className="list-disc list-inside space-y-2">
                      {(t.raw('bdRole.sections.offer.culture.items') as string[]).map(
                        (item, index) => (
                          <li key={index} className="leading-relaxed">
                            <Span
                              dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                              }}
                            />
                          </li>
                        )
                      )}
                    </ul>
                  </Div>
                </Div>
              </Div>

              {/* How to Apply */}
              <Div className="bg-gp-primary/5 p-6 rounded-lg border-l-4 border-gp-primary">
                <H3 size="h5" className="mb-4 text-gp-primary">
                  {t('bdRole.sections.apply.title')}
                </H3>
                <P className="mb-4">{t('bdRole.sections.apply.instructions')}</P>
                <ol className="list-decimal list-inside space-y-2 mb-6">
                  {(t.raw('bdRole.sections.apply.requirements') as string[]).map((req, index) => (
                    <li key={index} className="leading-relaxed">
                      <Span
                        dangerouslySetInnerHTML={{
                          __html: req.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                        }}
                      />
                    </li>
                  ))}
                </ol>
                <P className="text-sm text-muted-foreground mb-6">
                  {t('bdRole.sections.apply.note')}
                </P>
                <Button
                  asChild
                  size="lg"
                  className="bg-gp-primary hover:bg-gp-primary/80 w-full md:w-auto"
                >
                  <a href="mailto:careers@greenpulse.ai?subject=BD%20%26%20Operations%20-%20Application">
                    {t('bdRole.sections.apply.cta')}
                  </a>
                </Button>
              </Div>
            </CardContent>
          </Card>
        </Div>
      </Section>

      {/* Why GreenPulse */}
      <Section size="xl" className="bg-muted/30">
        <Div className="container mx-auto max-w-4xl">
          <H2 size="h3" className="text-center mb-12">
            {t('mission.title')}
          </H2>

          <Div className="space-y-8">
            {/* Our Mission */}
            <Div>
              <H3 size="h5" className="mb-4 text-gp-primary">
                {t('mission.ourMission.title')}
              </H3>
              <P className="leading-relaxed">{t('mission.ourMission.content')}</P>
            </Div>

            {/* Our Traction */}
            <Div>
              <H3 size="h5" className="mb-4 text-gp-primary">
                {t('mission.traction.title')}
              </H3>
              <ul className="list-disc list-inside space-y-2">
                {(t.raw('mission.traction.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </Div>

            {/* Our Values */}
            <Div>
              <H3 size="h5" className="mb-4 text-gp-primary">
                {t('mission.values.title')}
              </H3>
              <ul className="list-disc list-inside space-y-2">
                {(t.raw('mission.values.items') as string[]).map((item, index) => (
                  <li key={index} className="leading-relaxed">
                    <Span
                      dangerouslySetInnerHTML={{
                        __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                      }}
                    />
                  </li>
                ))}
              </ul>
            </Div>
          </Div>
        </Div>
      </Section>

      {/* Future Opportunities */}
      <Section size="xl">
        <Div className="container mx-auto max-w-4xl">
          <H2 size="h3" className="mb-6">
            {t('future.title')}
          </H2>
          <P className="mb-4">{t('future.content')}</P>
          <ul className="list-disc list-inside space-y-2 mb-6">
            {(t.raw('future.roles') as string[]).map((role, index) => (
              <li key={index} className="leading-relaxed">
                <Span
                  dangerouslySetInnerHTML={{
                    __html: role.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  }}
                />
              </li>
            ))}
          </ul>
          <P className="text-muted-foreground">{t('future.cta')}</P>
        </Div>
      </Section>

      {/* Contact */}
      <Section size="xl" className="bg-muted/30">
        <Div className="container mx-auto max-w-4xl text-center">
          <H2 size="h3" className="mb-8">
            {t('contact.title')}
          </H2>
          <Div className="space-y-4">
            <P>
              <Strong>{t('contact.general')}</Strong>
              <br />
              <Button asChild variant="link" className="text-gp-primary">
                <a href={`mailto:${t('contact.email')}`}>{t('contact.email')}</a>
              </Button>
            </P>
            <P>
              <Strong>{t('contact.partnership')}</Strong>
              <br />
              <Button asChild variant="link" className="text-gp-primary">
                <a href={`mailto:${t('contact.email')}`}>{t('contact.email')}</a>
              </Button>
            </P>
            <P>
              <Strong>{t('contact.moreInfo')}</Strong>
              <br />
              <Button asChild variant="link" className="text-gp-primary">
                <Link href="/">www.ai-greenpulse.com</Link>
              </Button>
            </P>
          </Div>
        </Div>
      </Section>

      {/* Footer */}
      <Section size="xl">
        <Div className="container mx-auto max-w-4xl text-center space-y-4">
          <P className="text-sm">
            <Span
              dangerouslySetInnerHTML={{
                __html: t('footer.eoe').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
              }}
            />
          </P>
          <P className="text-sm text-muted-foreground italic">{t('footer.updated')}</P>
        </Div>
      </Section>
    </>
  )
}
