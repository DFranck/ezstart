'use client'

import { useState, useMemo } from 'react'
import { Badge, Card, CardContent, Div, H1, H2, Input, P, Span } from '@ezstart/ui/components'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { componentRegistry, type ComponentEntry, type ComponentLevel } from '../registry'

// ─── Level config ──────────────────────────────────────────────

const levelConfig: Record<
  ComponentLevel,
  { label: string; badgeVariant: 'success' | 'info' | 'purple' | 'warning' }
> = {
  atom: { label: 'Atom', badgeVariant: 'success' },
  molecule: { label: 'Molecule', badgeVariant: 'info' },
  organism: { label: 'Organism', badgeVariant: 'purple' },
  template: { label: 'Template', badgeVariant: 'warning' },
}

// ─── Hierarchy data ────────────────────────────────────────────

function buildData() {
  const entries = Object.values(componentRegistry)

  // parentMap: child → parents that use it
  const parentMap = new Map<string, string[]>()
  const usageCount = new Map<string, number>()
  for (const entry of entries) {
    for (const child of entry.children) {
      const parents = parentMap.get(child) || []
      parents.push(entry.name)
      parentMap.set(child, parents)
      usageCount.set(child, (usageCount.get(child) || 0) + 1)
    }
  }

  // Stats
  const counts = { atom: 0, molecule: 0, organism: 0, template: 0 }
  for (const e of entries) counts[e.level]++

  let mostUsed = { name: '', count: 0 }
  for (const [name, count] of usageCount) {
    if (count > mostUsed.count) mostUsed = { name, count }
  }

  return { entries, parentMap, usageCount, counts, mostUsed }
}

// ─── Recursive hierarchy renderer ─────────────────────────────

function HierarchyTree({
  name,
  locale,
  depth,
  visited,
}: {
  name: string
  locale: string
  depth: number
  visited: Set<string>
}) {
  const entry = componentRegistry[name]
  if (!entry || visited.has(name)) return null

  const config = levelConfig[entry.level]
  const newVisited = new Set(visited)
  newVisited.add(name)

  return (
    <Div className="space-y-1" style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <Div className="flex items-center gap-1.5 flex-wrap">
        {depth > 0 && <Span className="text-muted-foreground text-xs">└</Span>}
        <Link href={`/${locale}/packages/ui/inspector/${name}`}>
          <Badge
            variant={config.badgeVariant}
            size="sm"
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            {name}
          </Badge>
        </Link>
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
        {entry.tokens.length > 0 && (
          <Span className="text-[10px] text-muted-foreground">
            {entry.tokens.map(t => t.name).join(', ')}
          </Span>
        )}
      </Div>
      {entry.children.length > 0 && depth < 4 && (
        <Div>
          {entry.children.map(childName => (
            <HierarchyTree
              key={childName}
              name={childName}
              locale={locale}
              depth={depth + 1}
              visited={newVisited}
            />
          ))}
        </Div>
      )}
    </Div>
  )
}

// ─── "Used by" reverse tree ────────────────────────────────────

function UsedByTree({
  name,
  locale,
  parentMap,
  depth,
  visited,
}: {
  name: string
  locale: string
  parentMap: Map<string, string[]>
  depth: number
  visited: Set<string>
}) {
  const parents = parentMap.get(name) || []
  if (parents.length === 0 || visited.has(name)) return null

  const newVisited = new Set(visited)
  newVisited.add(name)

  return (
    <Div className="space-y-1" style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      {parents.map(parentName => {
        const parentEntry = componentRegistry[parentName]
        const config = parentEntry ? levelConfig[parentEntry.level] : levelConfig.atom
        return (
          <Div key={parentName}>
            <Div className="flex items-center gap-1.5">
              {depth >= 0 && <Span className="text-muted-foreground text-xs">↑</Span>}
              <Link href={`/${locale}/packages/ui/inspector/${parentName}`}>
                <Badge
                  variant={config.badgeVariant}
                  size="sm"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {parentName}
                </Badge>
              </Link>
            </Div>
            {depth < 3 && (
              <UsedByTree
                name={parentName}
                locale={locale}
                parentMap={parentMap}
                depth={depth + 1}
                visited={newVisited}
              />
            )}
          </Div>
        )
      })}
    </Div>
  )
}

// ─── Main page ─────────────────────────────────────────────────

export default function HierarchyPage() {
  const params = useParams()
  const locale = params.locale as string
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const data = useMemo(() => buildData(), [])

  const allEntries = useMemo(() => {
    const sorted = [...data.entries].sort((a, b) => {
      const countA = data.usageCount.get(a.name) || 0
      const countB = data.usageCount.get(b.name) || 0
      return countB - countA
    })
    if (!search) return sorted
    const lower = search.toLowerCase()
    return sorted.filter(e => e.name.toLowerCase().includes(lower))
  }, [data, search])

  const selectedEntry = selected ? componentRegistry[selected] : null

  return (
    <Div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <Div className="space-y-2">
        <Link
          href={`/${locale}/packages/ui/inspector`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Inspector
        </Link>
        <H1 className="text-2xl font-bold">Component Hierarchy</H1>
        <P className="text-muted-foreground text-sm">
          Select a component to explore its dependency tree and reverse usage.
        </P>
      </Div>

      {/* Stats */}
      <Div className="flex flex-wrap items-center gap-3 text-sm">
        <Span className="font-medium">{data.entries.length} total</Span>
        <Badge variant="success" size="sm">
          Atom {data.counts.atom}
        </Badge>
        <Badge variant="info" size="sm">
          Molecule {data.counts.molecule}
        </Badge>
        <Badge variant="purple" size="sm">
          Organism {data.counts.organism}
        </Badge>
        <Badge variant="warning" size="sm">
          Template {data.counts.template}
        </Badge>
        {data.mostUsed.name && (
          <Span className="text-muted-foreground">
            Most used:{' '}
            <Span className="font-mono font-medium text-foreground">{data.mostUsed.name}</Span> (
            {data.mostUsed.count}x)
          </Span>
        )}
      </Div>

      {/* Search */}
      <Input
        placeholder="Search components..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Horizontal scroll — all components as badges */}
      <Div className="overflow-x-auto pb-2">
        <Div className="flex gap-1 min-w-max">
          {allEntries.map(entry => {
            const config = levelConfig[entry.level]
            const isSelected = selected === entry.name
            const usage = data.usageCount.get(entry.name) || 0
            return (
              <Badge
                key={entry.name}
                variant={isSelected ? 'default' : config.badgeVariant}
                size="sm"
                className={`cursor-pointer transition-all text-xs shrink-0 ${
                  isSelected ? 'ring-2 ring-primary scale-105' : 'hover:opacity-80'
                }`}
                onClick={() => setSelected(isSelected ? null : entry.name)}
              >
                {entry.name}
                {usage > 0 && <Span className="ml-1 opacity-60">{usage}x</Span>}
              </Badge>
            )
          })}
        </Div>
      </Div>

      {/* Selected component detail */}
      {selectedEntry && (
        <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Children tree (what it uses) */}
          <Card variant="default">
            <CardContent className="pt-4 space-y-3">
              <Div className="flex items-center gap-2">
                <H2 className="text-sm font-medium">Dependencies</H2>
                <Span className="text-xs text-muted-foreground">What {selected} is built from</Span>
              </Div>
              {selectedEntry.children.length > 0 ? (
                <HierarchyTree name={selected!} locale={locale} depth={0} visited={new Set()} />
              ) : (
                <P className="text-sm text-muted-foreground italic">
                  Pure primitive — no UI component dependencies
                </P>
              )}
            </CardContent>
          </Card>

          {/* Used by tree (what uses it) */}
          <Card variant="default">
            <CardContent className="pt-4 space-y-3">
              <Div className="flex items-center gap-2">
                <H2 className="text-sm font-medium">Used by</H2>
                <Span className="text-xs text-muted-foreground">
                  Components that consume {selected}
                </Span>
              </Div>
              {(data.parentMap.get(selected!) || []).length > 0 ? (
                <UsedByTree
                  name={selected!}
                  locale={locale}
                  parentMap={data.parentMap}
                  depth={0}
                  visited={new Set()}
                />
              ) : (
                <P className="text-sm text-muted-foreground italic">
                  Not used by any other component
                </P>
              )}
            </CardContent>
          </Card>

          {/* Component info */}
          <Card variant="default" className="md:col-span-2">
            <CardContent className="pt-4 space-y-2">
              <Div className="flex items-center gap-2 flex-wrap">
                <Link href={`/${locale}/packages/ui/inspector/${selected}`}>
                  <H2 className="text-lg font-semibold font-mono hover:underline cursor-pointer">
                    {selected}
                  </H2>
                </Link>
                <Badge variant={levelConfig[selectedEntry.level].badgeVariant} size="sm">
                  {levelConfig[selectedEntry.level].label}
                </Badge>
                {selectedEntry.providesTokens.length > 0 && (
                  <Div className="flex items-center gap-1">
                    <Span className="text-[10px] text-success">provides:</Span>
                    {selectedEntry.providesTokens.map(t => (
                      <Badge key={t} variant="success" size="sm" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </Div>
                )}
                {selectedEntry.inheritsTokens.length > 0 && (
                  <Div className="flex items-center gap-1">
                    <Span className="text-[10px] text-info">inherits:</Span>
                    {selectedEntry.inheritsTokens.map(t => (
                      <Badge key={t} variant="info" size="sm" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </Div>
                )}
              </Div>
              <P className="text-xs text-muted-foreground">{selectedEntry.description}</P>
              <P className="text-[10px] text-muted-foreground/60 font-mono">
                {selectedEntry.sourcePath}
              </P>
            </CardContent>
          </Card>
        </Div>
      )}

      {/* No selection hint */}
      {!selected && (
        <Div className="text-center py-8">
          <P className="text-muted-foreground">Click a component above to explore its hierarchy</P>
        </Div>
      )}
    </Div>
  )
}
