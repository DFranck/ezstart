'use client'

import {
  Aside,
  Button,
  DEFAULT_ASIDE_VARIANTS,
  Div,
  H3,
  P,
  tagVariantsMeta,
} from '@ezstart/ui/components'
import { useState } from 'react'
import PlaygroundCodeView from '../components/playground-code-view'
import { PlaygroundVariantSelects } from '../components/playground-variant-selects'
import { ModernPlaygroundLayout } from '../components/modern-playground-layout'
import { buildFakeTag } from '../utils/build-fake-tag'

const meta = tagVariantsMeta['aside']

function omitKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const clone = { ...obj }
  keys.forEach(key => {
    delete clone[key]
  })
  return clone
}

export default function AsidePlayground() {
  const initialVariants = omitKeys(DEFAULT_ASIDE_VARIANTS, ['withHeaderOffset'])
  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initialVariants).map(([key, value]) => [key, String(value)]))
  )

  const handleChange = (prop: string, value: string) => {
    setSelected(prev => ({ ...prev, [prop]: value }))
  }

  const content = (
    <Aside {...selected}>
      <Div size="xs">
        <H3>I'm an Aside</H3>
        <P>
          An aside is typically used for complementary content like sidebars, callouts, or related
          information.
        </P>
        <Button>Related Action</Button>
      </Div>
    </Aside>
  )

  const fakeTagCode = buildFakeTag('aside', selected, undefined, '...')
  const fakeAliasCode = buildFakeTag('aside', selected, 'Aside', '...')

  return (
    <ModernPlaygroundLayout
      title="<Aside> Component Playground"
      activeVariants={selected}
      preview={content}
      controls={<PlaygroundVariantSelects meta={meta} selected={selected} onChange={handleChange} />}
      codeView={<PlaygroundCodeView fakeTagCode={fakeTagCode} fakeAliasCode={fakeAliasCode} />}
    />
  )
}
