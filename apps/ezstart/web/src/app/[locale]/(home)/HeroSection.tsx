'use client'

import { SkillShowcase } from '@/components/JobShowing'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { Div, H1, Section, TextGradient } from '@ezstart/ui/components'
import Image from 'next/image'
import ContactsList from '../../../components/contactsList'

type Props = { id?: string }

const HeroSection = ({ id }: Props): any => {
  const t = useSafeTranslations('home.hero')
  const skillsShowcase = t.raw('skillsShowcase') as Array<{
    first: string
    second: string
  }>

  const image = (
    <Image
      src="/images/franck_no_background.png"
      alt="Franck Dufournet"
      width={500}
      height={500}
      className="rounded-full object-cover shadow-md bg-primary z-10 w-[150px] h-[150px] md:w-[300px] md:h-[300px]"
    />
  )

  const content = (
    <>
      <H1 size={'giant'} className="text-center md:text-wrap">
        <TextGradient from="ezstart" via="primary" to="ezstart" speed={5}>
          {t('title')}
        </TextGradient>
      </H1>
      <SkillShowcase skills={skillsShowcase} />
      <ContactsList />
    </>
  )

  return (
    <AuroraBackground id={id}>
      <Section size="full" className="py-20 md:py-0">
        <Div size="xs" className="md:hidden flex flex-col items-center">
          {image}
          {content}
        </Div>
        <Div layout="row" className="hidden md:flex max-w-4xl items-center">
          <Div size="xs">{content}</Div>
          {image}
        </Div>
      </Section>
    </AuroraBackground>
  )
}

export default HeroSection
