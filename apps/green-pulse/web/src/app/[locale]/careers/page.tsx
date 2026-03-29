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
  LI,
  P,
  Section,
  Span,
  Strong,
  UL,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function CareersPage() {
  const t = useTranslations('careers')

  return (
    <>
      {/* Hero Section - Overview Style */}
      <Section size="xl" className="mt-20 bg-gradient-to-b from-gp-primary/5 to-transparent">
        <Div className="container mx-auto text-center max-w-4xl">
          <H1 size="h2" className="mb-6 text-gp-primary">
            {t('hero.title')}
          </H1>
          <P className="text-xl text-foreground font-medium mb-4">{t('hero.subtitle')}</P>
          <P className="text-lg text-muted-foreground max-w-3xl mx-auto">{t('hero.description')}</P>
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
                      <UL className="list-disc list-inside space-y-1 text-muted-foreground">
                        {item.tasks.map((task, taskIndex) => (
                          <LI key={taskIndex}>{task}</LI>
                        ))}
                      </UL>
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
                    <UL className="list-disc list-inside space-y-2">
                      {(t.raw('bdRole.sections.requirements.mustHave.items') as string[]).map(
                        (item, index) => (
                          <LI key={index} className="leading-relaxed">
                            <Span
                              dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*(.*?)\*\*/g, '<Strong>$1</Strong>'),
                              }}
                            />
                          </LI>
                        )
                      )}
                    </UL>
                  </Div>

                  {/* Ideal Background */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.requirements.idealBackground.title')}
                    </H3>
                    <UL className="list-disc list-inside space-y-2">
                      {(
                        t.raw('bdRole.sections.requirements.idealBackground.items') as string[]
                      ).map((item, index) => (
                        <LI key={index} className="leading-relaxed">
                          <Span
                            dangerouslySetInnerHTML={{
                              __html: item.replace(/\*\*(.*?)\*\*/g, '<Strong>$1</Strong>'),
                            }}
                          />
                        </LI>
                      ))}
                    </UL>
                  </Div>

                  {/* NOT Required */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.requirements.notRequired.title')}
                    </H3>
                    <UL className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(t.raw('bdRole.sections.requirements.notRequired.items') as string[]).map(
                        (item, index) => (
                          <LI key={index}>{item}</LI>
                        )
                      )}
                    </UL>
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
                    <UL className="list-disc list-inside space-y-2">
                      {(t.raw('bdRole.sections.offer.compensation.items') as string[]).map(
                        (item, index) => (
                          <LI key={index} className="leading-relaxed">
                            <Span
                              dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*(.*?)\*\*/g, '<Strong>$1</Strong>'),
                              }}
                            />
                          </LI>
                        )
                      )}
                    </UL>
                  </Div>

                  {/* Growth & Impact */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.offer.growth.title')}
                    </H3>
                    <UL className="list-disc list-inside space-y-2">
                      {(t.raw('bdRole.sections.offer.growth.items') as string[]).map(
                        (item, index) => (
                          <LI key={index} className="leading-relaxed">
                            <Span
                              dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*(.*?)\*\*/g, '<Strong>$1</Strong>'),
                              }}
                            />
                          </LI>
                        )
                      )}
                    </UL>
                  </Div>

                  {/* Team Culture */}
                  <Div>
                    <H3 size="h6" className="mb-2">
                      {t('bdRole.sections.offer.culture.title')}
                    </H3>
                    <UL className="list-disc list-inside space-y-2">
                      {(t.raw('bdRole.sections.offer.culture.items') as string[]).map(
                        (item, index) => (
                          <LI key={index} className="leading-relaxed">
                            <Span
                              dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*(.*?)\*\*/g, '<Strong>$1</Strong>'),
                              }}
                            />
                          </LI>
                        )
                      )}
                    </UL>
                  </Div>
                </Div>
              </Div>

              {/* Apply CTA - Simplified */}
              <Div className="text-center pt-8 border-t">
                <Button
                  asChild
                  size="lg"
                  className="bg-gp-primary hover:bg-gp-primary/80 text-white font-bold"
                >
                  <a href="mailto:aseradni@nexora-venture.com?subject=BD%20%26%20Operations%20-%20Application">
                    {t('bdRole.sections.apply.cta')}
                  </a>
                </Button>
                <P className="text-sm text-muted-foreground mt-4">
                  Send your CV and a brief description to:{' '}
                  <Strong>aseradni@nexora-venture.com</Strong>
                </P>
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
              <UL className="list-disc list-inside space-y-2">
                {(t.raw('mission.traction.items') as string[]).map((item, index) => (
                  <LI key={index}>{item}</LI>
                ))}
              </UL>
            </Div>

            {/* Our Values */}
            <Div>
              <H3 size="h5" className="mb-4 text-gp-primary">
                {t('mission.values.title')}
              </H3>
              <UL className="list-disc list-inside space-y-2">
                {(t.raw('mission.values.items') as string[]).map((item, index) => (
                  <LI key={index} className="leading-relaxed">
                    <Span
                      dangerouslySetInnerHTML={{
                        __html: item.replace(/\*\*(.*?)\*\*/g, '<Strong>$1</Strong>'),
                      }}
                    />
                  </LI>
                ))}
              </UL>
            </Div>
          </Div>
        </Div>
      </Section>

      {/* Future Opportunities */}
      <Section size="xl" className="bg-gradient-to-b from-muted/20 to-transparent">
        <Div className="container mx-auto max-w-4xl">
          <H2 size="h3" className="mb-6 italic text-center">
            {t('future.title')}
          </H2>
          <Div className="bg-card p-8 rounded-lg border shadow-sm">
            <P className="mb-6 text-base leading-relaxed">{t('future.content')}</P>
            <UL className="space-y-3 mb-6">
              {(t.raw('future.roles') as string[]).map((role, index) => (
                <LI key={index} className="flex items-start gap-3 leading-relaxed">
                  <Icon
                    name="lucide:Sparkles"
                    size={18}
                    className="text-gp-primary flex-shrink-0 mt-0.5"
                  />
                  <Span
                    dangerouslySetInnerHTML={{
                      __html: role.replace(/\*\*(.*?)\*\*/g, '<Strong>$1</Strong>'),
                    }}
                  />
                </LI>
              ))}
            </UL>
            <P className="text-muted-foreground text-sm italic border-t pt-4">{t('future.cta')}</P>
          </Div>
        </Div>
      </Section>

      {/* Footer */}
      <Section size="xl">
        <Div className="container mx-auto max-w-4xl text-center space-y-4">
          <P className="text-sm">
            <Span
              dangerouslySetInnerHTML={{
                __html: t('footer.eoe').replace(/\*\*(.*?)\*\*/g, '<Strong>$1</Strong>'),
              }}
            />
          </P>
          <P className="text-sm text-muted-foreground italic">{t('footer.updated')}</P>
        </Div>
      </Section>
    </>
  )
}
