'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

// ⚡ PERFORMANCE: Dynamic import to reduce initial bundle size
// framer-motion (used by MacbookScroll) is ~150KB - only load on home page
const MacbookScroll = dynamic(
  () => import('@ezstart/ui/components').then(mod => ({ default: mod.MacbookScroll })),
  { ssr: false }
)

const FlippingGallery = dynamic(
  () => import('@/components/ui/flipping-gallery').then(mod => ({ default: mod.FlippingGallery })),
  { ssr: false }
)

type Props = {
  id?: string
}

const LibsSection = ({ id }: Props): any => {
  const t = useTranslations('libraries')
  return (
    <MacbookScroll
      title={t('title')}
      content={<FlippingGallery items={t.raw('items')} autoplay />}
    />
  )
}

export default LibsSection
