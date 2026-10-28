'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Div,
  H2,
  Icon,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Script from 'next/script'

interface FaqItem {
  question: string
  answer: string
}

export function FaqSection() {
  const t = useTranslations('home')
  const questions = t.raw('faq.questions') as FaqItem[]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }

  return (
    <Section size={'wide'} id="faq" className="bg-muted/30">
      <Script
        id="json-ld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Div className="container mx-auto max-w-4xl">
        <H2 size="h3" className="text-center mb-12">
          {t('faq.title')}
        </H2>

        <Accordion type="multiple" className="space-y-4">
          {questions.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`faq-${index}`}
              className="bg-card border rounded-lg"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <Div className="flex items-start gap-3 text-left">
                  <Icon
                    name="lucide:HelpCircle"
                    className="w-5 h-5 flex-shrink-0 mt-1 text-gp-primary"
                    aria-hidden="true"
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
  )
}
