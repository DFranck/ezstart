'use client'

import { Suspense, type ReactNode } from 'react'
import type { ComponentEntry } from '@ezstart/pay-sdk/components/registry'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CodeBlock,
  Div,
  H3,
  P,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { PreviewFrame } from './PreviewFrame'
import { PropsTable } from './PropsTable'
import { demoRegistry } from '../_demos/registry'

interface ComponentShowcaseProps {
  entry: ComponentEntry
}

/**
 * Showcase chrome for a single component. Renders Preview / Code / Props /
 * Anatomy as Radix tabs. Demos are statically registered in
 * `_demos/registry.ts` so they get proper Webpack code-splitting.
 */
export function ComponentShowcase({ entry }: ComponentShowcaseProps) {
  const t = useTranslations('components')
  const DemoComponent = demoRegistry[entry.name]

  let demo: ReactNode = null
  let demoError = false
  if (DemoComponent) {
    demo = (
      <Suspense fallback={<Spinner variant="primary" size="lg" />}>
        <DemoComponent />
      </Suspense>
    )
  } else {
    demoError = true
  }

  const primaryExample = entry.examples[0] ?? buildFallbackSnippet(entry)

  return (
    <Tabs defaultValue="preview" className="w-full">
      <TabsList>
        <TabsTrigger value="preview">{t('tabPreview')}</TabsTrigger>
        <TabsTrigger value="code">{t('tabCode')}</TabsTrigger>
        <TabsTrigger value="props">
          {t('tabProps')}
          <Badge variant="secondary" size="xs" className="ml-1.5 font-mono">
            {entry.props.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="anatomy">{t('tabAnatomy')}</TabsTrigger>
      </TabsList>

      <TabsContent value="preview" className="mt-4">
        <PreviewFrame demo={demo} demoError={demoError} fallbackText={t('previewMissing')} />
      </TabsContent>

      <TabsContent value="code" className="mt-4 space-y-4">
        {entry.examples.length === 0 ? (
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-sm">{t('codeFallbackTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <P className="text-xs text-muted-foreground mb-3">{t('codeFallbackDescription')}</P>
              <CodeBlock code={primaryExample} language="tsx" />
            </CardContent>
          </Card>
        ) : (
          entry.examples.map((example, idx) => (
            <Card key={idx} variant="default">
              <CardHeader>
                <CardTitle className="text-sm">
                  {t('codeExampleTitle', { index: idx + 1 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CodeBlock code={stripFence(example)} language={detectLanguage(example)} />
              </CardContent>
            </Card>
          ))
        )}
        {entry.description && entry.description !== entry.summary && (
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-sm">{t('codeDescriptionTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <P className="text-sm whitespace-pre-wrap">{entry.description}</P>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="props" className="mt-4">
        <PropsTable props={entry.props} />
      </TabsContent>

      <TabsContent value="anatomy" className="mt-4">
        <Card variant="default">
          <CardHeader>
            <CardTitle className="text-base">{t('anatomyTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entry.isCompound && entry.compoundParts.length > 0 ? (
              <>
                <P className="text-sm text-muted-foreground">{t('anatomyCompoundDescription')}</P>
                <Div className="space-y-2">
                  <H3 size="h6">{t('anatomyExportsHeading')}</H3>
                  <Div className="flex flex-wrap gap-2">
                    {entry.compoundParts.map(part => (
                      <Badge key={part} variant="outline" className="font-mono">
                        {part}
                      </Badge>
                    ))}
                  </Div>
                </Div>
              </>
            ) : (
              <P className="text-sm text-muted-foreground">{t('anatomySingleDescription')}</P>
            )}
            <Div className="space-y-2 pt-2 border-t">
              <H3 size="h6">{t('anatomyImportHeading')}</H3>
              <CodeBlock
                code={`import { ${entry.name} } from '${entry.importPath}'`}
                language="tsx"
              />
            </Div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function stripFence(text: string): string {
  // Remove optional ```tsx ... ``` fences from raw TSDoc examples
  const fenceMatch = text.match(/^```(\w+)?\n([\s\S]*?)\n```\s*$/)
  return fenceMatch ? fenceMatch[2]! : text
}

function detectLanguage(text: string): string {
  const fenceMatch = text.match(/^```(\w+)/)
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1]
  return 'tsx'
}

function buildFallbackSnippet(entry: ComponentEntry): string {
  const requiredProps = entry.props
    .filter(p => p.required)
    .map(p => `  ${p.name}={/* ${p.type} */}`)
    .join('\n')
  const propsBlock = requiredProps ? '\n' + requiredProps + '\n' : ''
  return `import { ${entry.name} } from '${entry.importPath}'\n\nexport function Example() {\n  return (\n    <${entry.name}${propsBlock}/>\n  )\n}`
}
