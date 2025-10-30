import { Div } from '@ezstart/ui/components'
import AsidePlayground from './playground/aside-playground'
import DivPlayground from './playground/div-playground'
import { HeadingPlayground } from './playground/heading-playground'
import ListingPlayground from './playground/listing-playground'
import NavPlayground from './playground/nav-playground'
import PPlayground from './playground/p-playground'
import SectionPlayground from './playground/section-playground'
import SpanPlayground from './playground/span-playground'

const page = async ({ params }: { params: Promise<{ tag: string }> }) => {
  const { tag } = await params

  return (
    <Div withHeaderOffset>
      {tag === 'section' && <SectionPlayground />}
      {tag === 'div' && <DivPlayground />}
      {tag === 'aside' && <AsidePlayground />}
      {tag === 'nav' && <NavPlayground />}
      {tag === 'p' && <PPlayground />}
      {tag === 'span' && <SpanPlayground />}
      {tag === 'heading' && <HeadingPlayground />}
      {tag === 'listing' && <ListingPlayground />}
    </Div>
  )
}

export default page
