'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H3,
  LI,
  Label,
  UL,
  listingVariantsMeta,
} from '@ezstart/ui/components'
import { useState } from 'react'
import PlaygroundCodeView from '../components/playground-code-view'
import { PlaygroundVariantSelects } from '../components/playground-variant-selects'
import { buildFakeTag } from '../utils/build-fake-tag'

const metaUL = listingVariantsMeta['ul'] || {}
const metaLI = listingVariantsMeta['li'] || {}

export default function ListingPlayground() {
  const [selectedUL, setSelectedUL] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    Object.entries(metaUL).forEach(([variantName, values]) => {
      out[variantName] = values.includes('default') ? 'default' : values[0] || ''
    })
    return out
  })

  const [selectedLI, setSelectedLI] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    Object.entries(metaLI).forEach(([variantName, values]) => {
      out[variantName] = values.includes('default') ? 'default' : values[0] || ''
    })
    return out
  })

  const handleChangeUL = (prop: string, value: string) => {
    setSelectedUL(prev => ({ ...prev, [prop]: value }))
  }

  const handleChangeLI = (prop: string, value: string) => {
    setSelectedLI(prev => ({ ...prev, [prop]: value }))
  }

  const fakeTagCodeUL = buildFakeTag('ul', selectedUL, 'UL', '\n  ...\n')
  const fakeTagCodeLI = buildFakeTag('li', selectedLI, 'LI', 'List item content')

  return (
    <Div className="space-y-6 py-8">
      {/* Header */}
      <H3 className="text-center">&lt;UL&gt; & &lt;LI&gt; Component Playground</H3>

      {/* Preview */}
      <Card variant="outline" className="relative overflow-hidden">
        <Div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <CardContent className="relative z-10 flex items-center justify-center min-h-[300px] p-8">
          <UL {...selectedUL}>
            <LI {...selectedLI}>First list item</LI>
            <LI {...selectedLI}>Second list item</LI>
            <LI {...selectedLI}>Third list item</LI>
            <LI {...selectedLI}>Fourth list item</LI>
          </UL>
        </CardContent>
      </Card>

      {/* Controls - 2 column layout */}
      <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UL Controls */}
        <Card variant="default">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              UL (List Container)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlaygroundVariantSelects
              meta={metaUL}
              selected={selectedUL}
              onChange={handleChangeUL}
            />
          </CardContent>
        </Card>

        {/* LI Controls */}
        <Card variant="default">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              LI (List Item)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlaygroundVariantSelects
              meta={metaLI}
              selected={selectedLI}
              onChange={handleChangeLI}
            />
          </CardContent>
        </Card>
      </Div>

      {/* Code Section - 2 column layout */}
      <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="floating">
          <CardHeader>
            <Label className="text-sm font-medium">UL Usage</Label>
          </CardHeader>
          <CardContent>
            <PlaygroundCodeView fakeTagCode={fakeTagCodeUL} fakeAliasCode={fakeTagCodeUL} />
          </CardContent>
        </Card>

        <Card variant="floating">
          <CardHeader>
            <Label className="text-sm font-medium">LI Usage</Label>
          </CardHeader>
          <CardContent>
            <PlaygroundCodeView fakeTagCode={fakeTagCodeLI} fakeAliasCode={fakeTagCodeLI} />
          </CardContent>
        </Card>
      </Div>
    </Div>
  )
}
