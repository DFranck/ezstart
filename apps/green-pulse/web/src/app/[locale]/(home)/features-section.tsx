'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H2,
  H3,
  Icon,
  KnownIconName,
  P,
  Section,
  Span,
  SplitSection,
  SplitSectionItem,
  Strong,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'

export function FeaturesSection() {
  const t = useTranslations('home')

  return (
    <>
      {/* Challenge Context Section */}
      <SplitSection
        diagonal={true}
        diagonalDirection="left"
        diagonalAngle={15}
        align="stretch"
        inverted
        className="lg:pb-20"
      >
        <SplitSectionItem size="xl" className="xl:mx-20">
          <H3 size={'h4'} className="text-xl lg:text-2xl font-bold mb-6 leading-tight">
            {t.rich('challenge.title', {
              strong: chunks => <Strong className="text-warning">{chunks}</Strong>,
            })}
          </H3>
        </SplitSectionItem>

        <SplitSectionItem className="h-full">
          <Div className="grid grid-rows-1 h-full">
            <Div className="relative w-full h-full">
              <Image
                src="/images/climate.webp"
                alt="Climate change and extreme weather illustration"
                fill
                className="object-cover"
              />
            </Div>
          </Div>
        </SplitSectionItem>
      </SplitSection>

      <H2 size="h3" className="text-center my-12">
        {t('challenge.sealTitle')}
      </H2>
      <Image
        src={'/images/pierced_seal_light.svg'}
        width={500}
        height={500}
        alt="Southeast Asia Climate Seal"
        className="dark:hidden"
      />
      <Image
        src={'/images/pierced_seal_dark.svg'}
        width={500}
        height={500}
        alt="Southeast Asia Climate Seal"
        className="hidden dark:block"
      />

      {/* Data Transformation Section */}
      <Section size="xl" id="how-it-works">
        <H2 size="h3">{t('transformation.title')}</H2>
        <Div size={'xl'} className="w-full">
          <Image
            src={'/images/GreenPulse_transformation_Desktop.svg'}
            width={500}
            height={500}
            alt="GreenPulse Transformation Process"
            className="hidden md:block dark:md:hidden w-full"
          />
          <Image
            src={'/images/GreenPulse_transformation_Desktop_dark.svg'}
            width={500}
            height={500}
            alt="GreenPulse Transformation Process"
            className="hidden dark:md:block w-full"
          />
          <Image
            src={'/images/GreenPulse_transformation_Mobile.svg'}
            width={500}
            height={500}
            alt="GreenPulse Transformation Process"
            className="block md:hidden dark:hidden"
          />
          <Image
            src={'/images/GreenPulse_transformation_Mobile_dark.svg'}
            width={500}
            height={500}
            alt="GreenPulse Transformation Process"
            className="hidden dark:block dark:md:hidden"
          />
        </Div>
        <Div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {(Array.isArray(t.raw('transformation.features'))
            ? t.raw('transformation.features')
            : []
          ).map((feature: { title: string; description: string }, index: number) => (
            <Card key={index}>
              <CardHeader className="flex items-center gap-3">
                <Icon
                  name={
                    index === 0
                      ? 'lucide:Database'
                      : index === 1
                        ? 'lucide:TrendingUp'
                        : 'lucide:FileText'
                  }
                  size={30}
                />
                <H3 size="h6" className="w-fit">
                  {feature.title}
                </H3>
              </CardHeader>
              <CardContent>
                <P className="text-muted-foreground">{feature.description}</P>
              </CardContent>
            </Card>
          ))}
        </Div>
      </Section>

      {/* Problem Statement Section */}
      <Section size={'xl'}>
        <Div className="container mx-auto">
          <Div className="text-center mb-12">
            <H2 size="h3" className="mb-4">
              {t.rich('problem.title', {
                strong: chunks => <Strong>{chunks}</Strong>,
              })}
            </H2>
            <P className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t.rich('problem.subtitle', {
                strong: chunks => <Strong className="text-warning">{chunks}</Strong>,
              })}
            </P>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {(Array.isArray(t.raw('problem.problems')) ? t.raw('problem.problems') : []).map(
              (item: { title: string; description: string }, index: number) => (
                <Card key={index}>
                  <CardHeader className="flex items-center gap-3">
                    <Icon
                      name={
                        (index === 0
                          ? 'lucide:Clock'
                          : index === 1
                            ? 'lucide:FileWarning'
                            : 'lucide:Users') as KnownIconName
                      }
                      size={30}
                      className="mr-3"
                    />
                    <H3 size="h6" className="w-fit">
                      {item.title}
                    </H3>
                  </CardHeader>
                  <CardContent>
                    <P className="text-muted-foreground text-sm">
                      {t.rich(`problem.problems.${index}.description`, {
                        strong: chunks => <Strong className="text-gp-primary">{chunks}</Strong>,
                      })}
                    </P>
                  </CardContent>
                </Card>
              )
            )}
          </Div>
        </Div>
      </Section>

      {/* Use Cases Section */}
      <Section size={'xl'} id="use-cases">
        <Div className="container mx-auto">
          <H2 size="h3" className="text-center mb-12">
            {t('useCases.title')}
          </H2>

          <Div className="flex flex-col gap-6 max-w-6xl mx-auto">
            {(
              t.raw('useCases.cases') as Array<{
                icon: string
                title: string
                challenge: string
                solution: string
                result: string
                badges: string[]
              }>
            ).map((useCase, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <Div className="flex flex-col md:flex-row gap-6 p-6">
                  <Div className="flex-shrink-0 text-center md:text-left">
                    <Div className="text-6xl md:text-7xl">{useCase.icon}</Div>
                  </Div>

                  <Div className="flex-1 space-y-4">
                    <H3 size="h5" className="text-gp-primary">
                      {useCase.title}
                    </H3>
                    <Div>
                      <Strong className="text-sm">Challenge:</Strong>
                      <P className="text-sm text-muted-foreground mt-1">{useCase.challenge}</P>
                    </Div>
                    <Div>
                      <Strong className="text-sm">Solution:</Strong>
                      <P className="text-sm text-muted-foreground mt-1">{useCase.solution}</P>
                    </Div>
                    <Div>
                      <Strong className="text-sm">Result:</Strong>
                      <P className="text-sm text-muted-foreground mt-1">{useCase.result}</P>
                    </Div>
                  </Div>

                  <Div className="flex-shrink-0 flex flex-wrap md:flex-col gap-2 md:justify-end md:items-end">
                    {useCase.badges.map((badge, badgeIndex) => (
                      <Span
                        key={badgeIndex}
                        className="bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap"
                      >
                        {badge}
                      </Span>
                    ))}
                  </Div>
                </Div>
              </Card>
            ))}
          </Div>

          <P className="text-center text-sm text-muted-foreground mt-8 italic max-w-4xl mx-auto">
            {t('useCases.disclaimer')}
          </P>
        </Div>
      </Section>

      {/* Credibility Section */}
      <Section size={'xl'}>
        <Div className="container mx-auto">
          <H2 size="h3" className="text-center mb-12">
            {t('credibility.title')}
          </H2>

          <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-8">
            {(
              t.raw('credibility.cards') as Array<{
                icon: string
                title: string
                description: string
              }>
            ).map((card, index) => (
              <Card
                key={index}
                className="border-t-4 border-t-gp-accent hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <Div className="flex items-center gap-3 mb-3">
                    <Div className="text-4xl flex-shrink-0">{card.icon}</Div>
                    <H3 size="h6" className="text-gp-primary">
                      {card.title}
                    </H3>
                  </Div>
                </CardHeader>
                <CardContent>
                  <P className="text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </P>
                </CardContent>
              </Card>
            ))}
          </Div>

          <Div className="max-w-4xl mx-auto mt-12 p-6 bg-muted/30 border-l-4 border-gp-primary rounded-lg">
            <P className="text-sm leading-relaxed">
              <Strong>{t('credibility.teamNote')}</Strong>
            </P>
          </Div>
        </Div>
      </Section>

      {/* FAQ Section */}
      <Section size={'xl'} className="bg-muted/30">
        <Div className="container mx-auto max-w-4xl">
          <H2 size="h3" className="text-center mb-12">
            {t('faq.title')}
          </H2>

          <Accordion type="multiple" className="space-y-4">
            {(
              t.raw('faq.questions') as Array<{
                question: string
                answer: string
              }>
            ).map((item, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="bg-card border rounded-lg"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <Div className="flex items-start gap-3 text-left">
                    <Icon
                      name="lucide:HelpCircle"
                      className="w-5 h-5 flex-shrink-0 mt-1 text-gp-primary"
                    />
                    <Span className="font-medium">{item.question}</Span>
                  </Div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <P className="text-muted-foreground leading-relaxed pl-8">{item.answer}</P>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Div>
      </Section>
    </>
  )
}
