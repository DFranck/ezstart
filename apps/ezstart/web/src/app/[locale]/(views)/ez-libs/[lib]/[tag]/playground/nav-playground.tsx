'use client'

import { Button, DEFAULT_NAV_VARIANTS, Div, H4, Nav, tagVariantsMeta } from '@ezstart/ui/components'
import { useState } from 'react'
import PlaygroundCodeView from '../components/playground-code-view'
import { PlaygroundVariantSelects } from '../components/playground-variant-selects'
import { ModernPlaygroundLayout } from '../components/modern-playground-layout'
import { buildFakeTag } from '../utils/build-fake-tag'

const meta = tagVariantsMeta['nav']

function omitKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const clone = { ...obj }
  keys.forEach(key => {
    delete clone[key]
  })
  return clone
}

export default function NavPlayground() {
  const initialVariants = omitKeys(DEFAULT_NAV_VARIANTS, ['withHeaderOffset'])
  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initialVariants).map(([key, value]) => [key, String(value)]))
  )

  const handleChange = (prop: string, value: string) => {
    setSelected(prev => ({ ...prev, [prop]: value }))
  }

  const content = (
    <Nav {...selected}>
      <H4>My App</H4>
      <Div className="flex gap-2">
        <Button variant="ghost" size="sm">
          Home
        </Button>
        <Button variant="ghost" size="sm">
          Profile
        </Button>
        <Button variant="ghost" size="sm">
          Settings
        </Button>
      </Div>
    </Nav>
  )

  const fakeTagCode = buildFakeTag('nav', selected, undefined, '...')
  const fakeAliasCode = buildFakeTag('nav', selected, 'Nav', '...')

  return (
    <ModernPlaygroundLayout
      title="<Nav> Component Playground"
      activeVariants={selected}
      preview={content}
      controls={
        <PlaygroundVariantSelects meta={meta} selected={selected} onChange={handleChange} />
      }
      codeView={<PlaygroundCodeView fakeTagCode={fakeTagCode} fakeAliasCode={fakeAliasCode} />}
    />
  )
}
