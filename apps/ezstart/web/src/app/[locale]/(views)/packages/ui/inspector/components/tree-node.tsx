'use client'

import { useState } from 'react'
import { Badge, Button, Div, P, Span } from '@ezstart/ui/components'
import {
  getComponent,
  getStructuralTokens,
  getVisualTokens,
  type ComponentEntry,
  type SlotInfo,
  type TokenInfo,
} from '../registry'
import { computeCompatibility, type ChainItem } from './inspector-preview'

const LEVEL_BADGE_VARIANT: Record<string, 'warning' | 'purple' | 'info' | 'success'> = {
  template: 'warning',
  organism: 'purple',
  molecule: 'info',
  atom: 'success',
}

function entryToChainItem(entry: ComponentEntry): ChainItem {
  return {
    name: entry.name,
    level: entry.level,
    tokens: entry.tokens,
    providesTokens: entry.providesTokens,
    inheritsTokens: entry.inheritsTokens,
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
    badges.push({ label: `${token} ✓ flows`, variant: 'success' })
  }
  for (const token of result.lost) {
    badges.push({ label: `${token} ignored`, variant: 'warning' })
  }
  for (const token of result.uncontrollable) {
    badges.push({ label: `${token} unwired`, variant: 'destructive' })
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
  const hasSlots = entry.slots.length > 0
  const hasAnyChildren = hasChildren || hasSlots

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
            {hasAnyChildren && (
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

            {/* Source path */}
            {entry.sourcePath && (
              <Span className="text-[10px] text-muted-foreground/50 font-mono hidden lg:inline">
                {entry.sourcePath.replace('packages/ui/src/components/', '')}
              </Span>
            )}

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
                  <Span className="text-muted-foreground ml-1 text-[10px]">per-component</Span>
                </Badge>
              ))}
            </Div>
          )}

          {/* Compatibility with parent */}
          {parentEntry && <CompatibilityInline parent={parentEntry} child={entry} />}
        </Div>
      </Div>

      {/* Children + Slots */}
      {hasAnyChildren && !collapsed && (
        <Div>
          {/* Composition slots FIRST — this is the real architecture */}
          {hasSlots &&
            entry.slots.map((slot, index) => {
              const slotIsLast = index === entry.slots.length - 1 && !hasChildren
              const nextAncestors = [...ancestors, !isLast]

              return (
                <SlotNode
                  key={`${componentName}-slot-${slot.name}`}
                  slot={slot}
                  ancestors={nextAncestors}
                  isLast={slotIsLast}
                  parentName={componentName}
                  tokens={tokens}
                  depth={depth}
                  visited={nextVisited}
                />
              )
            })}

          {/* Imported children — internal implementation detail */}
          {hasChildren && (
            <InternalChildren
              entry={entry}
              componentName={componentName}
              tokens={tokens}
              depth={depth}
              visited={nextVisited}
              isLast={!hasSlots}
              ancestors={[...ancestors, !isLast]}
            />
          )}

          {/* Slots already rendered above */}
        </Div>
      )}
    </Div>
  )
}

/**
 * Renders a composition slot node in the tree.
 * Slots are ReactNode props that accept external content via composition.
 * When expectedComponents is provided, renders each as an expandable TreeNode.
 */
function SlotNode({
  slot,
  ancestors,
  isLast,
  parentName,
  tokens,
  depth,
  visited,
}: {
  slot: SlotInfo
  ancestors: boolean[]
  isLast: boolean
  parentName?: string
  tokens: Record<string, string>
  depth: number
  visited: Set<string>
}) {
  const [collapsed, setCollapsed] = useState(false)
  const hasExpectedComponents =
    !slot.isRenderProp && slot.expectedComponents && slot.expectedComponents.length > 0

  return (
    <Div className="space-y-0">
      <Div className="flex items-start gap-0">
        <TreeConnector ancestors={ancestors} isLast={isLast && !hasExpectedComponents} />

        <Div className="flex items-center gap-1.5 py-1">
          {/* Collapse toggle for slots with expected components */}
          {hasExpectedComponents && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Span className="text-xs">{collapsed ? '\u25B6' : '\u25BC'}</Span>
            </Button>
          )}

          <Span className="text-sm" aria-hidden="true">
            {slot.isRenderProp ? '\uD83D\uDD27' : '\uD83D\uDCE6'}
          </Span>

          <Span
            className={`font-mono text-sm ${slot.required ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
          >
            {slot.name}
          </Span>

          <Badge variant="secondary" size="sm">
            <Span className="text-[10px]">{slot.isRenderProp ? 'render prop' : 'slot'}</Span>
          </Badge>

          {slot.required && (
            <Badge variant="outline" size="sm">
              <Span className="text-[10px] text-destructive">required</Span>
            </Badge>
          )}

          {/* Show expected components hint or "custom content" */}
          {!slot.isRenderProp &&
            (hasExpectedComponents ? (
              <Span className="text-[10px] text-muted-foreground">
                expects: {slot.expectedComponents.join(', ')}
              </Span>
            ) : (
              <Span className="text-[10px] text-muted-foreground italic">custom content</Span>
            ))}
        </Div>
      </Div>

      {/* Render expected components as expandable tree nodes */}
      {hasExpectedComponents &&
        !collapsed &&
        slot.expectedComponents.map((compName, index) => {
          const childIsLast = index === slot.expectedComponents.length - 1
          const nextAncestors = [...ancestors, !isLast]

          return (
            <TreeNode
              key={`slot-${slot.name}-${compName}-${index}`}
              componentName={compName}
              parentName={parentName}
              tokens={tokens}
              depth={depth + 1}
              visited={visited}
              isLast={childIsLast}
              ancestors={nextAncestors}
            />
          )
        })}
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
 * Collapsible section for internally imported children.
 * These are implementation details, not composition architecture.
 * De-emphasized visually (muted, collapsed by default).
 */
function InternalChildren({
  entry,
  componentName,
  tokens,
  depth,
  visited,
  isLast,
  ancestors,
}: {
  entry: ComponentEntry
  componentName: string
  tokens: Record<string, string>
  depth: number
  visited: Set<string>
  isLast: boolean
  ancestors: boolean[]
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Div className="space-y-0">
      <Div className="flex items-start gap-0">
        <TreeConnector ancestors={ancestors} isLast={isLast} />
        <Div className="flex items-center gap-1.5 py-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            <Span className="text-xs">{expanded ? '\u25BC' : '\u25B6'}</Span>
          </Button>
          <Span className="text-sm" aria-hidden="true">
            {'\uD83D\uDD27'}
          </Span>
          <Span className="text-muted-foreground text-sm">internal ({entry.children.length})</Span>
          <Badge variant="secondary" size="sm">
            <Span className="text-[10px]">implementation detail</Span>
          </Badge>
        </Div>
      </Div>

      {expanded &&
        entry.children.map((childName, index) => {
          const childIsLast = index === entry.children.length - 1
          const nextAncestors = [...ancestors, !isLast]

          return (
            <Div key={`${componentName}-${childName}-${index}`} className="opacity-60">
              <TreeNode
                componentName={childName}
                parentName={componentName}
                tokens={tokens}
                depth={depth + 1}
                visited={visited}
                isLast={childIsLast}
                ancestors={nextAncestors}
              />
            </Div>
          )
        })}
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
