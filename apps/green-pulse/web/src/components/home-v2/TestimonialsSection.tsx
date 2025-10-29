'use client'

import { Button, Card, H2, Icon, P, Section } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

/**
 * Testimonials section with slider
 * Client testimonials showcasing real-world impact
 */
export function TestimonialsSection() {
  const t = useTranslations('homeV2.testimonials')
  const [activeIndex, setActiveIndex] = useState(0)

  const testimonials = [
    {
      quote: t('testimonial1.quote'),
      author: t('testimonial1.author'),
      role: t('testimonial1.role'),
      company: t('testimonial1.company'),
      avatar: 'https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/660ab84e0d7f990b2dd9f129_Erin_Roussey.jpeg',
    },
    {
      quote: t('testimonial2.quote'),
      author: t('testimonial2.author'),
      role: t('testimonial2.role'),
      company: t('testimonial2.company'),
      avatar: null,
    },
    {
      quote: t('testimonial3.quote'),
      author: t('testimonial3.author'),
      role: t('testimonial3.role'),
      company: t('testimonial3.company'),
      avatar: null,
    },
  ]

  const handlePrev = () => {
    setActiveIndex(prev => (prev === 0 ? testimonials.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveIndex(prev => (prev === testimonials.length - 1 ? 0 : prev + 1))
  }

  return (
    <Section size={'xl'} className="bg-gradient-to-br from-green-900 to-blue-900 dark:from-green-950 dark:to-blue-950 relative overflow-hidden">
      {/* Decorative quote marks */}
      <div className="absolute top-10 left-10 opacity-10">
        <Icon name="lucide:Quote" className="w-32 h-32 text-white" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-10 rotate-180">
        <Icon name="lucide:Quote" className="w-32 h-32 text-white" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Title */}
        <div className="text-center mb-12">
          <H2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white">
            {t('title')}
          </H2>
          <P className="text-lg sm:text-xl text-white/80">
            {t('subtitle')}
          </P>
        </div>

        {/* Testimonial card */}
        <Card className="p-8 lg:p-12 bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          {/* Stars */}
          <div className="flex gap-1 mb-6 justify-center">
            {[...Array(5)].map((_, i) => (
              <Icon
                key={i}
                name="lucide:Star"
                className="w-6 h-6 text-yellow-400 fill-yellow-400"
              />
            ))}
          </div>

          {/* Quote */}
          <P className="text-lg lg:text-xl text-white/90 leading-relaxed mb-8 text-center italic">
            &ldquo;{testimonials[activeIndex].quote}&rdquo;
          </P>

          {/* Author info */}
          <div className="flex flex-col items-center gap-4">
            {testimonials[activeIndex].avatar && (
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/30">
                <img
                  src={testimonials[activeIndex].avatar}
                  alt={testimonials[activeIndex].author}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="text-center">
              <P className="font-bold text-white text-lg">
                {testimonials[activeIndex].author}
              </P>
              <P className="text-white/70">
                {testimonials[activeIndex].role}
              </P>
              <P className="text-white/60 text-sm">
                {testimonials[activeIndex].company}
              </P>
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <Button
            onClick={handlePrev}
            variant="outline"
            size="icon"
            className="rounded-full bg-white/10 border-white/30 hover:bg-white/20 text-white"
          >
            <Icon name="lucide:ChevronLeft" className="w-6 h-6" />
          </Button>

          {/* Dots */}
          <div className="flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'bg-white w-8'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            variant="outline"
            size="icon"
            className="rounded-full bg-white/10 border-white/30 hover:bg-white/20 text-white"
          >
            <Icon name="lucide:ChevronRight" className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </Section>
  )
}
