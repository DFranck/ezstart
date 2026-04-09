'use client'

import { useState, useMemo } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  H3,
  Input,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  componentRegistry,
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
  const hasChildren = entry.children && entry.children.length > 0

  return (
    <Div className="space-y-0">
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
          <CardContent className="pt-0 space-y-2">
            {entry.sourcePath && (
              <P className="text-[10px] text-muted-foreground/60 font-mono truncate">
                {entry.sourcePath.replace('packages/ui/src/components/', '')}
              </P>
            )}
            {entry.description && (
              <P className="text-xs text-muted-foreground mb-2">{entry.description}</P>
            )}
            {entry.tokens.length > 0 && (
              <Div className="flex flex-wrap gap-1">
                {entry.tokens.map(token => (
                  <Badge
                    key={token.name}
                    variant={token.category === 'structural' ? 'outline' : 'secondary'}
                    size="sm"
                  >
                    {token.name}
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
      {hasChildren && (
        <Div className="px-3 pb-2 pt-1 border-x border-b border-border/50 rounded-b-md -mt-1 space-y-1">
          <Div className="flex items-center justify-between">
            <P className="text-xs text-muted-foreground">Children:</P>
            <Link href={`/${locale}/packages/ui/inspector/explorer/${entry.name}`}>
              <Badge
                variant="outline"
                size="sm"
                className="cursor-pointer hover:bg-accent transition-colors text-[10px]"
              >
                View tree
              </Badge>
            </Link>
          </Div>
          <Div className="flex flex-wrap gap-1">
            {entry.children.map(childName => (
              <Link
                key={childName}
                href={`/${locale}/packages/ui/inspector/${entry.name}/${childName}`}
              >
                <Badge
                  variant="secondary"
                  size="sm"
                  className="cursor-pointer hover:bg-accent transition-colors"
                >
                  {childName}
                </Badge>
              </Link>
            ))}
          </Div>
        </Div>
      )}
    </Div>
  )
}

function LevelSection({
  level,
  locale,
  search,
}: {
  level: ComponentLevel
  locale: string
  search: string
}) {
  const config = levelConfig[level]
  const allComponents = getComponentsByLevel(level)
  const components = useMemo(() => {
    if (!search) return allComponents
    const lower = search.toLowerCase()
    return allComponents.filter(entry => entry.name.toLowerCase().includes(lower))
  }, [allComponents, search])

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
  const [search, setSearch] = useState('')

  const totalFound = useMemo(() => {
    if (!search) return null
    const lower = search.toLowerCase()
    return Object.values(componentRegistry).filter(entry =>
      entry.name.toLowerCase().includes(lower)
    ).length
  }, [search])

  const filteredChains = useMemo(() => {
    if (!search) return popularChains
    const lower = search.toLowerCase()
    return popularChains.filter(({ chain }) =>
      chain.some(name => name.toLowerCase().includes(lower))
    )
  }, [search])

  return (
    <Div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <Div className="space-y-2 text-center">
        <H1 className="text-2xl font-bold">Design System Inspector</H1>
        <P className="text-muted-foreground">
          Visualize how design tokens flow through the component hierarchy
        </P>
      </Div>

      {/* Search */}
      <Div className="relative max-w-md mx-auto">
        <Input
          placeholder="Search components..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-8"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <Span className="text-sm font-medium">&#x2715;</Span>
          </Button>
        )}
        {totalFound !== null && (
          <P className="text-sm text-muted-foreground mt-2 text-center">
            {totalFound} component{totalFound !== 1 ? 's' : ''} found
          </P>
        )}
      </Div>

      {/* Popular chains */}
      {filteredChains.length > 0 && (
        <Section className="space-y-3">
          <H2 className="text-lg font-semibold">Popular Chains</H2>
          <Div className="flex flex-wrap gap-2">
            {filteredChains.map(({ label, chain }) => (
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
      )}

      {/* Tree Explorer */}
      <Section className="space-y-3">
        <Div className="space-y-1">
          <H2 className="text-lg font-semibold">Tree Explorer</H2>
          <P className="text-sm text-muted-foreground">
            View the full recursive hierarchy of a component and how tokens propagate through all
            descendants
          </P>
        </Div>
        <Div className="flex flex-wrap gap-2">
          {getComponentsByLevel('complex')
            .filter(entry => entry.children.length > 0)
            .map(entry => (
              <Link
                key={entry.name}
                href={`/${locale}/packages/ui/inspector/explorer/${entry.name}`}
              >
                <Badge
                  variant="purple"
                  className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5 text-sm"
                >
                  {entry.name}
                </Badge>
              </Link>
            ))}
        </Div>
      </Section>

      {/* Component sections by level */}
      <LevelSection level="complex" locale={locale} search={search} />
      <LevelSection level="composed" locale={locale} search={search} />
      <LevelSection level="base" locale={locale} search={search} />
    </Div>
  )
}
