'use client'

import { Card, CardContent, Div, H2, P, Section } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function TestimonialsSection() {
  const t = useTranslations('landing')

  return (
    <Section size="xl" className="bg-gradient-payment text-primary-foreground">
      <H2 size="h3" className="text-center mb-12 text-primary-foreground">
        {t('testimonials.title')}
      </H2>

      <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {(Array.isArray(t.raw('testimonials.items')) ? t.raw('testimonials.items') : []).map(
          (testimonial: { quote: string; author: string; role: string }, index: number) => (
            <Card
              key={index}
              className="bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/20"
            >
              <CardContent className="p-6 space-y-4">
                <P className="text-primary-foreground/90 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </P>
                <Div>
                  <P className="font-semibold text-primary-foreground">{testimonial.author}</P>
                  <P className="text-sm text-primary-foreground/70">{testimonial.role}</P>
                </Div>
              </CardContent>
            </Card>
          )
        )}
      </Div>
    </Section>
  )
}
