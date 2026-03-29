'use client'

import ContactsList from '@/components/contactsList'
import { H2, P } from '@ezstart/ui/components'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import dynamic from 'next/dynamic'
import { FC, HTMLAttributes } from 'react'

// ⚡ PERFORMANCE: Dynamic import to reduce initial bundle size
// framer-motion (used by LampContainer) is ~150KB - only load on home page
const LampContainer = dynamic(
  () => import('@ezstart/ui/components').then(mod => ({ default: mod.LampContainer })),
  { ssr: false }
)

type Props = HTMLAttributes<HTMLElement>

const ContactSection: FC<Props> = ({ className, ...rest }) => {
  const t = useSafeTranslations('contact')

  return (
    <LampContainer className={` ${className ?? ''}`} {...rest}>
      <H2 className="md:text-center">{t('subtitle')}</H2>
      <P>{t('description')}</P>
      <ContactsList className="justify-center" />
    </LampContainer>
  )
}

export default ContactSection
