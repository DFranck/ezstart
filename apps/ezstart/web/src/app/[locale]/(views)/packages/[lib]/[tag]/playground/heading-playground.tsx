'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
  Div,
  HEADING_TAGS,
  Span,
  Tag,
  headingVariants,
  tagVariantsMeta,
} from '@ezstart/ui/components'
import { useState } from 'react'
import { buildFakeTag } from '../utils/build-fake-tag'
import PlaygroundCodeView from '../components/playground-code-view'
import { PlaygroundVariantSelects } from '../components/playground-variant-selects'
import { ModernPlaygroundLayout } from '../components/modern-playground-layout'

export const HeadingPlayground = () => (
  <Div className="space-y-6 py-8">
    <Accordion type="multiple" className="w-full">
      {HEADING_TAGS.map(tag => (
        <AccordionItem value={tag} key={tag}>
          <AccordionTrigger className="text-xl font-semibold">
            <Span className="font-mono">&lt;{tag}&gt;</Span> Playground
          </AccordionTrigger>
          <AccordionContent>
            <HeadingVariantTester tag={tag} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </Div>
)

type TesterProps = {
  tag: (typeof HEADING_TAGS)[number]
}

const HeadingVariantTester = ({ tag }: TesterProps): React.JSX.Element => {
  const meta = tagVariantsMeta[tag]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic variant factory lookup
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
    <Div className="pt-4">
      <ModernPlaygroundLayout
        title={`<${tag}> Component`}
        activeVariants={selected}
        preview={
          <Tag as={tag} {...selected}>
            {content}
          </Tag>
        }
        controls={
          <PlaygroundVariantSelects meta={meta} selected={selected} onChange={handleChange} />
        }
        codeView={<PlaygroundCodeView fakeTagCode={fakeTagCode} fakeAliasCode={fakeAliasCode} />}
      />
    </Div>
  )
}
