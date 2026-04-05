'use client'

import { MacbookScroll } from '@ezstart/ui/components'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

const FlippingGallery = dynamic(
  () => import('@/components/ui/flipping-gallery').then(mod => ({ default: mod.FlippingGallery })),
  { ssr: false }
)

type Props = {
  id?: string
}

const LibsSection = ({ id }: Props): React.JSX.Element => {
  const t = useTranslations('packages')
  return (
    <MacbookScroll
      title={t('title')}
      content={<FlippingGallery items={t.raw('items')} autoplay />}
    />
  )
}

export default LibsSection
