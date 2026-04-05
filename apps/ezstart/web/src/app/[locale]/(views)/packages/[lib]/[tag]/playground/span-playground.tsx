'use client'

import { DEFAULT_SPAN_VARIANTS, P, Span, tagVariantsMeta } from '@ezstart/ui/components'
import { useState } from 'react'
import PlaygroundCodeView from '../components/playground-code-view'
import { PlaygroundVariantSelects } from '../components/playground-variant-selects'
import { ModernPlaygroundLayout } from '../components/modern-playground-layout'
import { buildFakeTag } from '../utils/build-fake-tag'

const meta = tagVariantsMeta['span']

export default function SpanPlayground() {
  const [selected, setSelected] = useState<Record<string, string>>(DEFAULT_SPAN_VARIANTS)

  const handleChange = (prop: string, value: string) => {
    setSelected(prev => ({ ...prev, [prop]: value }))
  }

  const content = (
    <P>
      I'm a paragraph with a <Span {...selected}>styled span</Span> inside. Play with my variants on the right.
    </P>
  )

  const fakeTagCode = buildFakeTag('span', selected, undefined, 'Styled span')
  const fakeAliasCode = buildFakeTag('span', selected, 'Span', 'Styled span')

  return (
    <ModernPlaygroundLayout
      title="<Span> Component Playground"
      activeVariants={selected}
      preview={content}
      controls={<PlaygroundVariantSelects meta={meta} selected={selected} onChange={handleChange} />}
      codeView={<PlaygroundCodeView fakeTagCode={fakeTagCode} fakeAliasCode={fakeAliasCode} />}
    />
  )
}
