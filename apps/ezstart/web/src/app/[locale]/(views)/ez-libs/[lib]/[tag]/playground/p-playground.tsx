'use client'

import { Input, Label, P, pVariantsMeta } from '@ezstart/ui/components'
import { useState } from 'react'
import PlaygroundCodeView from '../components/playground-code-view'
import { PlaygroundVariantSelects } from '../components/playground-variant-selects'
import { ModernPlaygroundLayout } from '../components/modern-playground-layout'
import { buildFakeTag } from '../utils/build-fake-tag'
import { generateLorem } from '../utils/generate-lorem'

export default function PPlayground() {
  const [selected, setSelected] = useState(() => {
    const out: Record<string, string> = {}
    Object.entries(pVariantsMeta).forEach(([variantName, values]) => {
      out[variantName] = values.includes('default') ? 'default' : values[0] || ''
    })
    return out
  })

  const handleChange = (prop: string, value: string) => {
    setSelected(prev => ({ ...prev, [prop]: value }))
  }

  const [contentInput, setContentInput] = useState('lorem20')
  const content = (() => {
    const match = contentInput.match(/^lorem(\d+)$/i)
    if (match && match[1]) {
      const count = parseInt(match[1], 10)
      return generateLorem(count)
    }
    return contentInput
  })()

  const fakeTagCode = buildFakeTag('p', selected, undefined, content)
  const fakeAliasCode = buildFakeTag('p', selected, 'P', content)

  return (
    <ModernPlaygroundLayout
      title="<P> Component Playground"
      activeVariants={selected}
      preview={<P {...selected}>{content}</P>}
      controls={
        <div className="space-y-6">
          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="contentInput" className="text-sm font-medium">
              Content
            </Label>
            <Input
              id="contentInput"
              type="text"
              value={contentInput}
              onChange={e => setContentInput(e.target.value)}
              placeholder="Type text or use 'lorem20'"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use "lorem" followed by a number (e.g., "lorem20") to generate Lorem Ipsum text
            </p>
          </div>

          {/* Variant Controls */}
          <PlaygroundVariantSelects meta={pVariantsMeta} selected={selected} onChange={handleChange} />
        </div>
      }
      codeView={<PlaygroundCodeView fakeTagCode={fakeTagCode} fakeAliasCode={fakeAliasCode} />}
    />
  )
}
