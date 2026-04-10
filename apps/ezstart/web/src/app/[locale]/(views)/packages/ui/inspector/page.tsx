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
  type TokenStatus,
} from './registry'

const levelConfig: Record<
  ComponentLevel,
  { label: string; badgeVariant: 'success' | 'info' | 'purple' | 'warning'; description: string }
> = {
  atom: {
    label: 'Atom',
    badgeVariant: 'success',
    description: 'Primitive components that apply tokens directly',
  },
  molecule: {
    label: 'Molecule',
    badgeVariant: 'info',
    description: 'Compound components that group atoms into reusable units',
  },
  organism: {
    label: 'Organism',
    badgeVariant: 'purple',
    description: 'Self-contained sections with complex internal logic',
  },
  template: {
    label: 'Template',
    badgeVariant: 'warning',
    description: 'Page-level layout orchestrators',
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
                {entry.tokens.map(token => {
                  const status = token.status || 'standard'
                  return (
                    <Badge
                      key={token.name}
                      variant={
                        status === 'radix'
                          ? 'outline'
                          : status === 'candidate'
                            ? 'warning'
                            : status === 'specific'
                              ? 'secondary'
                              : token.category === 'structural'
                                ? 'outline'
                                : 'secondary'
                      }
                      size="sm"
                      className={status === 'specific' ? 'opacity-50' : undefined}
                    >
                      {token.name}
                    </Badge>
                  )
                })}
                {entry.providesTokens.length > 0 && (
                  <Badge
                    variant="success"
                    size="sm"
                    title={`Provides: ${entry.providesTokens.join(', ')}`}
                  >
                    P
                  </Badge>
                )}
                {entry.inheritsTokens.length > 0 && (
                  <Badge
                    variant="info"
                    size="sm"
                    title={`Inherits: ${entry.inheritsTokens.join(', ')}`}
                  >
                    C
                  </Badge>
                )}
              </Div>
            )}
            {entry.tokens.length === 0 && (
              <Div className="flex flex-wrap gap-1">
                {entry.providesTokens.length > 0 && (
                  <Badge
                    variant="success"
                    size="sm"
                    title={`Provides: ${entry.providesTokens.join(', ')}`}
                  >
                    P
                  </Badge>
                )}
                {entry.inheritsTokens.length > 0 && (
                  <Badge
                    variant="info"
                    size="sm"
                    title={`Inherits: ${entry.inheritsTokens.join(', ')}`}
                  >
                    C
                  </Badge>
                )}
                {entry.providesTokens.length === 0 && entry.inheritsTokens.length === 0 && (
                  <Span className="text-xs text-muted-foreground italic">No tokens</Span>
                )}
              </Div>
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
  activeTokenFilter,
}: {
  level: ComponentLevel
  locale: string
  search: string
  activeTokenFilter: string | null
}) {
  const config = levelConfig[level]
  const allComponents = getComponentsByLevel(level)
  const components = useMemo(() => {
    let filtered = allComponents
    if (search) {
      const lower = search.toLowerCase()
      filtered = filtered.filter(entry => entry.name.toLowerCase().includes(lower))
    }
    if (activeTokenFilter) {
      filtered = filtered.filter(
        entry =>
          entry.tokens.some(t => t.name === activeTokenFilter) ||
          entry.providesTokens.includes(activeTokenFilter) ||
          entry.inheritsTokens.includes(activeTokenFilter)
      )
    }
    return filtered
  }, [allComponents, search, activeTokenFilter])

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

const categoryBadgeVariant: Record<string, 'outline' | 'secondary' | 'success'> = {
  structural: 'outline',
  visual: 'secondary',
}

export default function InspectorIndexPage() {
  const params = useParams()
  const locale = params.locale as string
  const [search, setSearch] = useState('')
  const [activeTokenFilter, setActiveTokenFilter] = useState<string | null>(null)
  const [activeStatusFilter, setActiveStatusFilter] = useState<TokenStatus | null>(null)

  const tokenStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        explicit: number
        providers: number
        consumers: number
        category: string
        status: TokenStatus
      }
    >()

    for (const entry of Object.values(componentRegistry)) {
      for (const token of entry.tokens) {
        const s = stats.get(token.name) || {
          explicit: 0,
          providers: 0,
          consumers: 0,
          category: token.category,
          status: (token.status || 'standard') as TokenStatus,
        }
        s.explicit++
        stats.set(token.name, s)
      }
      for (const t of entry.providesTokens) {
        const s = stats.get(t) || {
          explicit: 0,
          providers: 0,
          consumers: 0,
          category: 'structural',
          status: 'standard' as TokenStatus,
        }
        s.providers++
        stats.set(t, s)
      }
      for (const t of entry.inheritsTokens) {
        const s = stats.get(t) || {
          explicit: 0,
          providers: 0,
          consumers: 0,
          category: 'structural',
          status: 'standard' as TokenStatus,
        }
        s.consumers++
        stats.set(t, s)
      }
    }

    return [...stats.entries()].sort(
      (a, b) =>
        b[1].explicit +
        b[1].providers +
        b[1].consumers -
        (a[1].explicit + a[1].providers + a[1].consumers)
    )
  }, [])

  const filteredComponentCount = useMemo(() => {
    if (!activeTokenFilter) return null
    return Object.values(componentRegistry).filter(
      entry =>
        entry.tokens.some(t => t.name === activeTokenFilter) ||
        entry.providesTokens.includes(activeTokenFilter) ||
        entry.inheritsTokens.includes(activeTokenFilter)
    ).length
  }, [activeTokenFilter])

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

      {/* Tokens — compact badge grid */}
      <Section className="space-y-3">
        <Div className="flex items-center gap-3 flex-wrap">
          <H2 className="text-lg font-semibold">Tokens</H2>
          {/* Status legend / filter */}
          {(() => {
            const counts = { standard: 0, radix: 0, candidate: 0, specific: 0 }
            for (const [, stat] of tokenStats) counts[stat.status]++
            const statusConfig: Record<
              TokenStatus,
              { label: string; variant: 'default' | 'outline' | 'warning' | 'secondary' }
            > = {
              standard: { label: 'standard', variant: 'default' },
              radix: { label: 'radix', variant: 'outline' },
              candidate: { label: 'candidate', variant: 'warning' },
              specific: { label: 'specific', variant: 'secondary' },
            }
            return (
              <Div className="flex gap-1.5">
                {(Object.keys(statusConfig) as TokenStatus[]).map(status => (
                  <Badge
                    key={status}
                    variant={activeStatusFilter === status ? 'info' : statusConfig[status].variant}
                    size="sm"
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() =>
                      setActiveStatusFilter(activeStatusFilter === status ? null : status)
                    }
                  >
                    {statusConfig[status].label}: {counts[status]}
                  </Badge>
                ))}
              </Div>
            )
          })()}
          {activeTokenFilter && (
            <Div className="flex items-center gap-2">
              <Badge variant="info" size="sm">
                {activeTokenFilter}: {filteredComponentCount} component
                {filteredComponentCount !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTokenFilter(null)}
                className="text-xs h-6 px-2"
              >
                Clear
              </Button>
            </Div>
          )}
        </Div>
        <Div className="flex flex-wrap gap-1.5">
          {tokenStats
            .filter(([, stat]) => !activeStatusFilter || stat.status === activeStatusFilter)
            .map(([name, stat]) => {
              const total = stat.explicit + stat.providers + stat.consumers
              const isActive = activeTokenFilter === name
              const status = stat.status
              const details = [
                stat.explicit > 0 && `${stat.explicit} props`,
                stat.providers > 0 && `${stat.providers}P`,
                stat.consumers > 0 && `${stat.consumers}C`,
              ]
                .filter(Boolean)
                .join(' · ')

              return (
                <Badge
                  key={name}
                  variant={
                    isActive
                      ? 'default'
                      : status === 'radix'
                        ? 'outline'
                        : status === 'candidate'
                          ? 'warning'
                          : status === 'specific'
                            ? 'secondary'
                            : categoryBadgeVariant[stat.category] || 'outline'
                  }
                  size="sm"
                  className={`cursor-pointer hover:opacity-80 transition-opacity${status === 'specific' && !isActive ? ' opacity-50' : ''}`}
                  onClick={() => setActiveTokenFilter(isActive ? null : name)}
                  title={`${name} (${stat.category}, ${status}) — ${stat.explicit} components, ${stat.providers} providers, ${stat.consumers} consumers`}
                >
                  <Span className="font-mono">{name}</Span>
                  <Span className="ml-1 opacity-60">{details || total}</Span>
                </Badge>
              )
            })}
        </Div>
      </Section>

      {/* Tree Explorer + Token Lexicon */}
      <Section className="space-y-3">
        <Div className="space-y-1">
          <Div className="flex items-center gap-3">
            <H2 className="text-lg font-semibold">Tree Explorer</H2>
            <Link href={`/${locale}/packages/ui/inspector/tokens`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent transition-colors">
                Token Lexicon
              </Badge>
            </Link>
            <Link href={`/${locale}/packages/ui/inspector/hierarchy`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent transition-colors">
                Component Hierarchy
              </Badge>
            </Link>
          </Div>
          <P className="text-sm text-muted-foreground">
            View the full recursive hierarchy of a component and how tokens propagate through all
            descendants
          </P>
        </Div>
        <Div className="flex flex-wrap gap-2">
          {[...getComponentsByLevel('organism'), ...getComponentsByLevel('template')]
            .filter(entry => entry.children.length > 0)
            .map(entry => (
              <Link
                key={entry.name}
                href={`/${locale}/packages/ui/inspector/explorer/${entry.name}`}
              >
                <Badge
                  variant={entry.level === 'template' ? 'warning' : 'purple'}
                  className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5 text-sm"
                >
                  {entry.name}
                </Badge>
              </Link>
            ))}
        </Div>
      </Section>

      {/* Component sections by level */}
      <LevelSection
        level="template"
        locale={locale}
        search={search}
        activeTokenFilter={activeTokenFilter}
      />
      <LevelSection
        level="organism"
        locale={locale}
        search={search}
        activeTokenFilter={activeTokenFilter}
      />
      <LevelSection
        level="molecule"
        locale={locale}
        search={search}
        activeTokenFilter={activeTokenFilter}
      />
      <LevelSection
        level="atom"
        locale={locale}
        search={search}
        activeTokenFilter={activeTokenFilter}
      />
    </Div>
  )
}
