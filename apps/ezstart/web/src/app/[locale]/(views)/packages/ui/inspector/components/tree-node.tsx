'use client'

import { useState } from 'react'
import { Badge, Button, Div, P, Span } from '@ezstart/ui/components'
import {
  getComponent,
  getStructuralTokens,
  getVisualTokens,
  type ComponentEntry,
  type TokenInfo,
} from '../registry'
import { computeCompatibility, type ChainItem } from './inspector-preview'

const LEVEL_BADGE_VARIANT: Record<string, 'purple' | 'info' | 'success'> = {
  complex: 'purple',
  composed: 'info',
  base: 'success',
}

function entryToChainItem(entry: ComponentEntry): ChainItem {
  return {
    name: entry.name,
    level: entry.level,
    tokens: entry.tokens,
  }
}

type TreeNodeProps = {
  componentName: string
  parentName?: string
  tokens: Record<string, string>
  depth: number
  visited: Set<string>
  isLast: boolean
  ancestors: boolean[]
}

function CompatibilityInline({ parent, child }: { parent: ComponentEntry; child: ComponentEntry }) {
  const result = computeCompatibility(entryToChainItem(parent), entryToChainItem(child))

  const badges: { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }[] =
    []

  for (const token of result.flows) {
    badges.push({ label: `${token} flows`, variant: 'success' })
  }
  for (const token of result.lost) {
    badges.push({ label: `${token} lost`, variant: 'warning' })
  }
  for (const token of result.uncontrollable) {
    badges.push({ label: `${token} uncontrollable`, variant: 'destructive' })
  }
  for (const token of result.localVisual) {
    badges.push({ label: `${token} local`, variant: 'secondary' })
  }

  if (badges.length === 0) return null

  return (
    <Div className="flex flex-wrap gap-1">
      {badges.map(({ label, variant }) => (
        <Badge key={label} variant={variant} size="sm">
          <Span className="font-mono text-[10px]">{label}</Span>
        </Badge>
      ))}
    </Div>
  )
}

export function TreeNode({
  componentName,
  parentName,
  tokens,
  depth,
  visited,
  isLast,
  ancestors,
}: TreeNodeProps) {
  const [collapsed, setCollapsed] = useState(false)

  const entry = getComponent(componentName)
  if (!entry) {
    return (
      <Div className="flex items-center gap-1">
        <TreeConnector ancestors={ancestors} isLast={isLast} />
        <Span className="text-destructive text-sm font-mono">{componentName}</Span>
        <Badge variant="destructive" size="sm">
          unknown
        </Badge>
      </Div>
    )
  }

  const isCircular = visited.has(componentName)
  const parentEntry = parentName ? getComponent(parentName) : undefined
  const badgeVariant = LEVEL_BADGE_VARIANT[entry.level] ?? 'secondary'
  const hasChildren = entry.children.length > 0 && !isCircular

  // Collect token info for this node
  const structuralTokens = getStructuralTokens(entry.tokens)
  const visualTokens = getVisualTokens(entry.tokens)

  // Build new visited set including this component
  const nextVisited = new Set(visited)
  nextVisited.add(componentName)

  return (
    <Div className="space-y-0">
      {/* Current node */}
      <Div className="flex items-start gap-0">
        <TreeConnector ancestors={ancestors} isLast={isLast} />

        <Div className="flex-1 min-w-0 py-1 space-y-1">
          <Div className="flex items-center gap-1.5 flex-wrap">
            {/* Collapse toggle */}
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setCollapsed(!collapsed)}
              >
                <Span className="text-xs">{collapsed ? '\u25B6' : '\u25BC'}</Span>
              </Button>
            )}

            {/* Level badge */}
            <Badge variant={badgeVariant} size="sm">
              {entry.level}
            </Badge>

            {/* Component name */}
            <Span className="font-semibold text-sm text-foreground">{entry.name}</Span>

            {/* Circular indicator */}
            {isCircular && (
              <Badge variant="warning" size="sm">
                already shown above
              </Badge>
            )}
          </Div>

          {/* Token values */}
          {(structuralTokens.length > 0 || visualTokens.length > 0) && (
            <Div className="flex flex-wrap gap-1 ml-0.5">
              {structuralTokens.map(t => (
                <Badge key={t.name} variant="outline" size="sm">
                  <Span className="font-mono text-[10px]">{t.name}</Span>
                  {tokens[t.name] && (
                    <Span className="text-primary ml-1 text-[10px]">= {tokens[t.name]}</Span>
                  )}
                </Badge>
              ))}
              {visualTokens.map(t => (
                <Badge key={t.name} variant="secondary" size="sm">
                  <Span className="font-mono text-[10px]">{t.name}</Span>
                  {tokens[t.name] && (
                    <Span className="text-primary ml-1 text-[10px]">= {tokens[t.name]}</Span>
                  )}
                  <Span className="text-muted-foreground ml-1 text-[10px]">local</Span>
                </Badge>
              ))}
            </Div>
          )}

          {/* Compatibility with parent */}
          {parentEntry && <CompatibilityInline parent={parentEntry} child={entry} />}
        </Div>
      </Div>

      {/* Children */}
      {hasChildren && !collapsed && (
        <Div>
          {entry.children.map((childName, index) => {
            const childIsLast = index === entry.children.length - 1
            const nextAncestors = [...ancestors, !isLast]

            return (
              <TreeNode
                key={`${componentName}-${childName}-${index}`}
                componentName={childName}
                parentName={componentName}
                tokens={tokens}
                depth={depth + 1}
                visited={nextVisited}
                isLast={childIsLast}
                ancestors={nextAncestors}
              />
            )
          })}
        </Div>
      )}
    </Div>
  )
}

/**
 * Renders the tree connector lines (vertical pipes + horizontal branches).
 * Uses Unicode box-drawing characters for clean rendering.
 */
function TreeConnector({ ancestors, isLast }: { ancestors: boolean[]; isLast: boolean }) {
  if (ancestors.length === 0 && isLast) {
    // Root node, no connector needed
    return null
  }

  return (
    <Div className="flex items-center shrink-0 select-none" aria-hidden="true">
      {/* Vertical lines from ancestors */}
      {ancestors.map((showLine, i) => (
        <Span
          key={i}
          className="inline-block w-6 text-center text-border"
          style={{ fontFamily: 'monospace' }}
        >
          {showLine ? '\u2502' : '\u00A0'}
        </Span>
      ))}

      {/* Branch connector */}
      <Span
        className="inline-block w-6 text-center text-border"
        style={{ fontFamily: 'monospace' }}
      >
        {isLast ? '\u2514' : '\u251C'}
      </Span>
      <Span
        className="inline-block w-3 text-center text-border"
        style={{ fontFamily: 'monospace' }}
      >
        {'\u2500'}
      </Span>
    </Div>
  )
}

/**
 * Recursively collects all unique tokens from a component and all its descendants.
 */
export function collectAllTokens(componentName: string, visited?: Set<string>): TokenInfo[] {
  const seen = visited ?? new Set<string>()
  if (seen.has(componentName)) return []
  seen.add(componentName)

  const entry = getComponent(componentName)
  if (!entry) return []

  const tokenMap = new Map<string, TokenInfo>()
  for (const token of entry.tokens) {
    tokenMap.set(token.name, token)
  }

  for (const childName of entry.children) {
    const childTokens = collectAllTokens(childName, seen)
    for (const token of childTokens) {
      if (!tokenMap.has(token.name)) {
        tokenMap.set(token.name, token)
      }
    }
  }

  return [...tokenMap.values()]
}
