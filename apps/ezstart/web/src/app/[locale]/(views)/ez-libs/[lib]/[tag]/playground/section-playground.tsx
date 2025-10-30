'use client'

import {
  Button,
  DEFAULT_SECTION_VARIANTS,
  Div,
  H2,
  H4,
  P,
  Section,
  tagVariantsMeta,
} from '@ezstart/ui/components'
import { useState } from 'react'
import PlaygroundCodeView from '../components/playground-code-view'
import { PlaygroundVariantSelects } from '../components/playground-variant-selects'
import { ModernPlaygroundLayout } from '../components/modern-playground-layout'
import { buildFakeTag } from '../utils/build-fake-tag'

const meta = tagVariantsMeta['section']

export default function SectionPlayground() {
  const [selected, setSelected] = useState<Record<string, string>>(DEFAULT_SECTION_VARIANTS)

  const handleChange = (prop: string, value: string) => {
    setSelected(prev => ({ ...prev, [prop]: value }))
  }

  const content = (
    <Section {...selected}>
      <Div size="xs">
        <H2>I'm a Section</H2>
        <H4>Play with me, controls are on the right</H4>
      </Div>
      <Div size="xs">
        <P>
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Delectus quo rerum officiis ex
          similique libero. Officiis esse corrupti magnam iste adipisci officia dignissimos ipsam
          ullam minus non incidunt accusamus eveniet inventore, deserunt culpa animi velit,
          voluptatibus sequi quia temporibus nemo dolorum eius.
        </P>
        <Button>Fake Action</Button>
      </Div>
    </Section>
  )

  const fakeTagCode = buildFakeTag('section', selected, undefined, '...')
  const fakeAliasCode = buildFakeTag('section', selected, 'Section', '...')

  return (
    <ModernPlaygroundLayout
      title="<Section> Component Playground"
      activeVariants={selected}
      preview={content}
      controls={<PlaygroundVariantSelects meta={meta} selected={selected} onChange={handleChange} />}
      codeView={<PlaygroundCodeView fakeTagCode={fakeTagCode} fakeAliasCode={fakeAliasCode} />}
    />
  )
}
