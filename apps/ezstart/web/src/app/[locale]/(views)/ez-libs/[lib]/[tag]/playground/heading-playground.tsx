'use client'

import { HEADING_TAGS, headingVariants, Tag, tagVariantsMeta } from '@ezstart/ui/components'
import { useState } from 'react'
import { buildFakeTag } from '../utils/build-fake-tag'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
} from '@ezstart/ui/components'
import PlaygroundCodeView from '../components/playground-code-view'
import { PlaygroundVariantSelects } from '../components/playground-variant-selects'
import { ModernPlaygroundLayout } from '../components/modern-playground-layout'

export const HeadingPlayground = () => (
  <div className="space-y-6 py-8">
    <Accordion type="multiple" className="w-full">
      {HEADING_TAGS.map(tag => (
        <AccordionItem value={tag} key={tag}>
          <AccordionTrigger className="text-xl font-semibold">
            <span className="font-mono">&lt;{tag}&gt;</span> Playground
          </AccordionTrigger>
          <AccordionContent>
            <HeadingVariantTester tag={tag} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
)

type TesterProps = {
  tag: (typeof HEADING_TAGS)[number]
}

const HeadingVariantTester = ({ tag }: TesterProps): any => {
  const meta = tagVariantsMeta[tag]
  const factory = headingVariants[tag] as any
  const getDefaultVariants = () => {
    const out: Record<string, string> = {}
    Object.entries(meta).forEach(([variantName, values]) => {
      if (variantName === 'size' && values.includes(tag)) {
        out[variantName] = tag
      } else {
        out[variantName] = factory.defaultVariants?.[variantName] ?? values[0]
      }
    })
    return out
  }

  const [selected, setSelected] = useState(getDefaultVariants)

  const handleChange = (prop: string, value: string) => {
    setSelected(prev => ({ ...prev, [prop]: value }))
  }

  const aliasComponent = `H${tag.slice(1)}`
  const content = `I'm a ${tag.toUpperCase()}`
  const fakeTagCode = buildFakeTag(tag, selected, undefined, content)
  const fakeAliasCode = buildFakeTag(tag, selected, aliasComponent, content)

  return (
    <div className="pt-4">
      <ModernPlaygroundLayout
        title={`<${tag}> Component`}
        activeVariants={selected}
        preview={
          <Tag as={tag} {...selected}>
            {content}
          </Tag>
        }
        controls={<PlaygroundVariantSelects meta={meta} selected={selected} onChange={handleChange} />}
        codeView={<PlaygroundCodeView fakeTagCode={fakeTagCode} fakeAliasCode={fakeAliasCode} />}
      />
    </div>
  )
}
