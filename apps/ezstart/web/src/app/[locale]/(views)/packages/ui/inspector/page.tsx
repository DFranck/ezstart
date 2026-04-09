'use client'

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  H3,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  getComponentsByLevel,
  popularChains,
  type ComponentEntry,
  type ComponentLevel,
} from './registry'

const levelConfig: Record<
  ComponentLevel,
  { label: string; badgeVariant: 'success' | 'info' | 'purple'; description: string }
> = {
  base: {
    label: 'Base',
    badgeVariant: 'success',
    description: 'Primitive components that apply tokens directly',
  },
  composed: {
    label: 'Composed',
    badgeVariant: 'info',
    description: 'Components that merge and drill tokens to 1-3 children',
  },
  complex: {
    label: 'Complex',
    badgeVariant: 'purple',
    description: 'Orchestrators that drill tokens through deep hierarchies',
  },
}

function ComponentCard({ entry, locale }: { entry: ComponentEntry; locale: string }) {
  const config = levelConfig[entry.level]

  return (
    <Link href={`/${locale}/packages/ui/inspector/${entry.name}`}>
      <Card
        variant="default"
        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
      >
        <CardHeader className="pb-2">
          <Div className="flex items-center justify-between">
            <H3 className="text-sm font-semibold">{entry.name}</H3>
            <Badge variant={config.badgeVariant} size="sm">
              {config.label}
            </Badge>
          </Div>
        </CardHeader>
        <CardContent className="pt-0">
          {entry.description && (
            <P className="text-xs text-muted-foreground mb-2">{entry.description}</P>
          )}
          {entry.tokens.length > 0 && (
            <Div className="flex flex-wrap gap-1">
              {entry.tokens.map(token => (
                <Badge key={token} variant="outline" size="sm">
                  {token}
                </Badge>
              ))}
            </Div>
          )}
          {entry.tokens.length === 0 && (
            <Span className="text-xs text-muted-foreground italic">No tokens</Span>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function LevelSection({ level, locale }: { level: ComponentLevel; locale: string }) {
  const config = levelConfig[level]
  const components = getComponentsByLevel(level)

  if (components.length === 0) return null

  return (
    <Section className="space-y-4">
      <Div className="space-y-1">
        <H2 className="text-lg font-semibold flex items-center gap-2">
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
          <Span className="text-muted-foreground text-sm font-normal">({components.length})</Span>
        </H2>
        <P className="text-sm text-muted-foreground">{config.description}</P>
      </Div>
      <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {components.map(entry => (
          <ComponentCard key={entry.name} entry={entry} locale={locale} />
        ))}
      </Div>
    </Section>
  )
}

export default function InspectorIndexPage() {
  const params = useParams()
  const locale = params.locale as string

  return (
    <Div withHeaderOffset className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <Div className="space-y-2 text-center">
        <H1 className="text-2xl font-bold">Design System Inspector</H1>
        <P className="text-muted-foreground">
          Visualize how design tokens flow through the component hierarchy
        </P>
      </Div>

      {/* Popular chains */}
      <Section className="space-y-3">
        <H2 className="text-lg font-semibold">Popular Chains</H2>
        <Div className="flex flex-wrap gap-2">
          {popularChains.map(({ label, chain }) => (
            <Link key={label} href={`/${locale}/packages/ui/inspector/${chain.join('/')}`}>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-accent transition-colors px-3 py-1.5 text-sm"
              >
                {label}
              </Badge>
            </Link>
          ))}
        </Div>
      </Section>

      {/* Component sections by level */}
      <LevelSection level="complex" locale={locale} />
      <LevelSection level="composed" locale={locale} />
      <LevelSection level="base" locale={locale} />
    </Div>
  )
}
