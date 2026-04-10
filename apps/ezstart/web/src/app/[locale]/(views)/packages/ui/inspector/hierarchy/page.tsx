'use client'

import { useState, useMemo, useCallback } from 'react'
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
import { componentRegistry, type ComponentEntry, type ComponentLevel } from '../registry'

// ─── Hierarchy data ────────────────────────────────────────────

type HierarchyData = {
  base: ComponentEntry[]
  composed: ComponentEntry[]
  complex: ComponentEntry[]
  parentMap: Map<string, string[]>
  usageCount: Map<string, number>
  mostUsedPrimitive: { name: string; count: number } | null
  mostTokens: { name: string; count: number } | null
  deepestChain: string[]
}

function buildHierarchy(): HierarchyData {
  const entries = Object.values(componentRegistry)

  const base = entries.filter(e => e.level === 'base')
  const composed = entries.filter(e => e.level === 'composed')
  const complex = entries.filter(e => e.level === 'complex')

  // parentMap: child → list of parents that use it
  const parentMap = new Map<string, string[]>()
  for (const entry of entries) {
    for (const child of entry.children) {
      const parents = parentMap.get(child) || []
      parents.push(entry.name)
      parentMap.set(child, parents)
    }
  }

  // usageCount: how many components list this one as a child
  const usageCount = new Map<string, number>()
  for (const entry of entries) {
    for (const child of entry.children) {
      usageCount.set(child, (usageCount.get(child) || 0) + 1)
    }
  }

  // Most-used primitive
  let mostUsedPrimitive: { name: string; count: number } | null = null
  for (const entry of base) {
    const count = usageCount.get(entry.name) || 0
    if (!mostUsedPrimitive || count > mostUsedPrimitive.count) {
      mostUsedPrimitive = { name: entry.name, count }
    }
  }

  // Most tokens
  let mostTokens: { name: string; count: number } | null = null
  for (const entry of entries) {
    const count = entry.tokens.length
    if (!mostTokens || count > mostTokens.count) {
      mostTokens = { name: entry.name, count }
    }
  }

  // Deepest chain (BFS from each complex component)
  let deepestChain: string[] = []
  const registryMap = componentRegistry

  function findDeepestPath(startName: string): string[] {
    let longest: string[] = [startName]
    const stack: Array<{ name: string; path: string[] }> = [{ name: startName, path: [startName] }]
    const visited = new Set<string>()

    while (stack.length > 0) {
      const current = stack.pop()!
      const entry = registryMap[current.name]
      if (!entry) continue

      if (current.path.length > longest.length) {
        longest = current.path
      }

      for (const child of entry.children) {
        const childKey = `${current.name}->${child}`
        if (!visited.has(childKey)) {
          visited.add(childKey)
          stack.push({ name: child, path: [...current.path, child] })
        }
      }
    }
    return longest
  }

  for (const entry of complex) {
    const path = findDeepestPath(entry.name)
    if (path.length > deepestChain.length) {
      deepestChain = path
    }
  }

  return {
    base,
    composed,
    complex,
    parentMap,
    usageCount,
    mostUsedPrimitive,
    mostTokens,
    deepestChain,
  }
}

// ─── Level config ──────────────────────────────────────────────

const levelConfig: Record<
  ComponentLevel,
  {
    label: string
    badgeVariant: 'success' | 'info' | 'purple'
    borderClass: string
  }
> = {
  base: {
    label: 'Base',
    badgeVariant: 'success',
    borderClass: 'border-success/30',
  },
  composed: {
    label: 'Composed',
    badgeVariant: 'info',
    borderClass: 'border-info/30',
  },
  complex: {
    label: 'Complex',
    badgeVariant: 'purple',
    borderClass: 'border-purple-500/30',
  },
}

// ─── Component row ─────────────────────────────────────────────

function ComponentRow({
  entry,
  locale,
  usageCount,
  parentMap,
  highlighted,
  onHover,
  onLeave,
  expandedUsedBy,
  onToggleUsedBy,
}: {
  entry: ComponentEntry
  locale: string
  usageCount: number
  parentMap: Map<string, string[]>
  highlighted: Set<string>
  onHover: (name: string) => void
  onLeave: () => void
  expandedUsedBy: Set<string>
  onToggleUsedBy: (name: string) => void
}) {
  const isHighlighted = highlighted.size > 0 && highlighted.has(entry.name)
  const isDimmed = highlighted.size > 0 && !highlighted.has(entry.name)
  const parents = parentMap.get(entry.name) || []
  const isExpanded = expandedUsedBy.has(entry.name)
  const config = levelConfig[entry.level]

  return (
    <Div
      className={`group rounded-md border px-2.5 py-1.5 transition-all ${config.borderClass} ${
        isHighlighted
          ? 'bg-accent/50 ring-1 ring-primary/30'
          : isDimmed
            ? 'opacity-30'
            : 'hover:bg-accent/30'
      }`}
      onMouseEnter={() => onHover(entry.name)}
      onMouseLeave={onLeave}
    >
      <Div className="flex items-center gap-1.5 flex-wrap">
        {/* Component name */}
        <Link href={`/${locale}/packages/ui/inspector/${entry.name}`}>
          <Span className="text-xs font-semibold hover:underline cursor-pointer">{entry.name}</Span>
        </Link>

        {/* Usage count */}
        {usageCount > 0 && (
          <Badge variant="secondary" size="sm" className="text-[10px] px-1 py-0">
            {usageCount}x
          </Badge>
        )}

        {/* Token badges */}
        {entry.providesTokens.length > 0 && (
          <Badge
            variant="success"
            size="sm"
            className="text-[10px] px-1 py-0"
            title={`Provides: ${entry.providesTokens.join(', ')}`}
          >
            P
          </Badge>
        )}
        {entry.inheritsTokens.length > 0 && (
          <Badge
            variant="info"
            size="sm"
            className="text-[10px] px-1 py-0"
            title={`Inherits: ${entry.inheritsTokens.join(', ')}`}
          >
            C
          </Badge>
        )}

        {/* Used by count */}
        {parents.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-auto px-1 py-0 text-muted-foreground hover:text-foreground"
            onClick={e => {
              e.preventDefault()
              onToggleUsedBy(entry.name)
            }}
          >
            used by {parents.length}
          </Button>
        )}
      </Div>

      {/* Children (for composed/complex) */}
      {entry.children.length > 0 && (
        <Div className="mt-1 ml-3 flex flex-wrap gap-1">
          {entry.children.map(childName => (
            <Link
              key={childName}
              href={`/${locale}/packages/ui/inspector/${entry.name}/${childName}`}
            >
              <Badge
                variant="outline"
                size="sm"
                className="text-[10px] px-1 py-0 cursor-pointer hover:bg-accent"
              >
                {childName}
              </Badge>
            </Link>
          ))}
        </Div>
      )}

      {/* Expanded "used by" list */}
      {isExpanded && parents.length > 0 && (
        <Div className="mt-1.5 ml-3 flex flex-wrap gap-1">
          <Span className="text-[10px] text-muted-foreground mr-1">Used by:</Span>
          {parents.map(parentName => (
            <Link key={parentName} href={`/${locale}/packages/ui/inspector/${parentName}`}>
              <Badge
                variant="secondary"
                size="sm"
                className="text-[10px] px-1 py-0 cursor-pointer hover:bg-accent"
              >
                {parentName}
              </Badge>
            </Link>
          ))}
        </Div>
      )}
    </Div>
  )
}

// ─── Column component ──────────────────────────────────────────

function HierarchyColumn({
  level,
  entries,
  locale,
  usageCountMap,
  parentMap,
  highlighted,
  onHover,
  onLeave,
  expandedUsedBy,
  onToggleUsedBy,
}: {
  level: ComponentLevel
  entries: ComponentEntry[]
  locale: string
  usageCountMap: Map<string, number>
  parentMap: Map<string, string[]>
  highlighted: Set<string>
  onHover: (name: string) => void
  onLeave: () => void
  expandedUsedBy: Set<string>
  onToggleUsedBy: (name: string) => void
}) {
  const config = levelConfig[level]

  return (
    <Section className="flex-1 min-w-0 space-y-3">
      <Div className="flex items-center gap-2">
        <Badge variant={config.badgeVariant}>{config.label}</Badge>
        <Span className="text-sm text-muted-foreground">({entries.length})</Span>
      </Div>
      <Div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
        {entries.map(entry => (
          <ComponentRow
            key={entry.name}
            entry={entry}
            locale={locale}
            usageCount={usageCountMap.get(entry.name) || 0}
            parentMap={parentMap}
            highlighted={highlighted}
            onHover={onHover}
            onLeave={onLeave}
            expandedUsedBy={expandedUsedBy}
            onToggleUsedBy={onToggleUsedBy}
          />
        ))}
      </Div>
    </Section>
  )
}

// ─── Main page ─────────────────────────────────────────────────

export default function HierarchyPage() {
  const params = useParams()
  const locale = params.locale as string
  const [search, setSearch] = useState('')
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null)
  const [expandedUsedBy, setExpandedUsedBy] = useState<Set<string>>(new Set())

  const hierarchy = useMemo(() => buildHierarchy(), [])

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) {
      return {
        base: hierarchy.base,
        composed: hierarchy.composed,
        complex: hierarchy.complex,
      }
    }
    const lower = search.toLowerCase()
    return {
      base: hierarchy.base.filter(e => e.name.toLowerCase().includes(lower)),
      composed: hierarchy.composed.filter(e => e.name.toLowerCase().includes(lower)),
      complex: hierarchy.complex.filter(e => e.name.toLowerCase().includes(lower)),
    }
  }, [hierarchy, search])

  // Sort by usage count (descending) within each level
  const sorted = useMemo(() => {
    const sortFn = (a: ComponentEntry, b: ComponentEntry) => {
      const countA = hierarchy.usageCount.get(a.name) || 0
      const countB = hierarchy.usageCount.get(b.name) || 0
      return countB - countA
    }
    return {
      base: [...filtered.base].sort(sortFn),
      composed: [...filtered.composed].sort(sortFn),
      complex: [...filtered.complex].sort(sortFn),
    }
  }, [filtered, hierarchy.usageCount])

  // Bidirectional highlight: all components that use the hovered one + all it uses
  const highlighted = useMemo(() => {
    if (!hoveredComponent) return new Set<string>()
    const set = new Set<string>()
    set.add(hoveredComponent)

    // Components that use hovered (parents)
    const parents = hierarchy.parentMap.get(hoveredComponent) || []
    for (const p of parents) set.add(p)

    // Components that hovered uses (children, recursively one level)
    const entry = componentRegistry[hoveredComponent]
    if (entry) {
      for (const child of entry.children) set.add(child)
    }

    return set
  }, [hoveredComponent, hierarchy.parentMap])

  const handleHover = useCallback((name: string) => setHoveredComponent(name), [])
  const handleLeave = useCallback(() => setHoveredComponent(null), [])
  const handleToggleUsedBy = useCallback((name: string) => {
    setExpandedUsedBy(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const totalFiltered = sorted.base.length + sorted.composed.length + sorted.complex.length
  const totalAll = hierarchy.base.length + hierarchy.composed.length + hierarchy.complex.length

  return (
    <Div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <Div className="space-y-2">
        <Link href={`/${locale}/packages/ui/inspector`}>
          <Span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
            &larr; Inspector
          </Span>
        </Link>
        <H1 className="text-2xl font-bold">Component Hierarchy</H1>
        <P className="text-muted-foreground">
          Genealogy of the design system — which primitives compose which components
        </P>
      </Div>

      {/* Stats bar */}
      <Card variant="default">
        <CardContent className="py-3">
          <Div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Div>
              <Span className="text-muted-foreground">Total: </Span>
              <Span className="font-semibold">{totalAll}</Span>
            </Div>
            <Div className="flex items-center gap-1.5">
              <Badge variant="success" size="sm">
                Base
              </Badge>
              <Span className="font-semibold">{hierarchy.base.length}</Span>
            </Div>
            <Div className="flex items-center gap-1.5">
              <Badge variant="info" size="sm">
                Composed
              </Badge>
              <Span className="font-semibold">{hierarchy.composed.length}</Span>
            </Div>
            <Div className="flex items-center gap-1.5">
              <Badge variant="purple" size="sm">
                Complex
              </Badge>
              <Span className="font-semibold">{hierarchy.complex.length}</Span>
            </Div>
            {hierarchy.mostUsedPrimitive && hierarchy.mostUsedPrimitive.count > 0 && (
              <Div>
                <Span className="text-muted-foreground">Most used: </Span>
                <Link href={`/${locale}/packages/ui/inspector/${hierarchy.mostUsedPrimitive.name}`}>
                  <Span className="font-semibold hover:underline cursor-pointer">
                    {hierarchy.mostUsedPrimitive.name}
                  </Span>
                </Link>
                <Span className="text-muted-foreground">
                  {' '}
                  ({hierarchy.mostUsedPrimitive.count}x)
                </Span>
              </Div>
            )}
            {hierarchy.mostTokens && hierarchy.mostTokens.count > 0 && (
              <Div>
                <Span className="text-muted-foreground">Most tokens: </Span>
                <Link href={`/${locale}/packages/ui/inspector/${hierarchy.mostTokens.name}`}>
                  <Span className="font-semibold hover:underline cursor-pointer">
                    {hierarchy.mostTokens.name}
                  </Span>
                </Link>
                <Span className="text-muted-foreground"> ({hierarchy.mostTokens.count})</Span>
              </Div>
            )}
          </Div>
          {hierarchy.deepestChain.length > 1 && (
            <Div className="mt-2 flex items-center gap-1 flex-wrap">
              <Span className="text-sm text-muted-foreground">Deepest chain: </Span>
              {hierarchy.deepestChain.map((name, i) => (
                <Span key={`${name}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <Span className="text-muted-foreground text-xs">&rarr;</Span>}
                  <Link href={`/${locale}/packages/ui/inspector/${name}`}>
                    <Badge
                      variant="outline"
                      size="sm"
                      className="cursor-pointer hover:bg-accent text-[10px]"
                    >
                      {name}
                    </Badge>
                  </Link>
                </Span>
              ))}
            </Div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <Div className="relative max-w-md">
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
        {search && (
          <P className="text-sm text-muted-foreground mt-1">
            {totalFiltered} component{totalFiltered !== 1 ? 's' : ''} found
          </P>
        )}
      </Div>

      {/* Three-column hierarchy */}
      <Div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HierarchyColumn
          level="base"
          entries={sorted.base}
          locale={locale}
          usageCountMap={hierarchy.usageCount}
          parentMap={hierarchy.parentMap}
          highlighted={highlighted}
          onHover={handleHover}
          onLeave={handleLeave}
          expandedUsedBy={expandedUsedBy}
          onToggleUsedBy={handleToggleUsedBy}
        />
        <HierarchyColumn
          level="composed"
          entries={sorted.composed}
          locale={locale}
          usageCountMap={hierarchy.usageCount}
          parentMap={hierarchy.parentMap}
          highlighted={highlighted}
          onHover={handleHover}
          onLeave={handleLeave}
          expandedUsedBy={expandedUsedBy}
          onToggleUsedBy={handleToggleUsedBy}
        />
        <HierarchyColumn
          level="complex"
          entries={sorted.complex}
          locale={locale}
          usageCountMap={hierarchy.usageCount}
          parentMap={hierarchy.parentMap}
          highlighted={highlighted}
          onHover={handleHover}
          onLeave={handleLeave}
          expandedUsedBy={expandedUsedBy}
          onToggleUsedBy={handleToggleUsedBy}
        />
      </Div>
    </Div>
  )
}
