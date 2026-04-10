'use client'

import { type ReactNode } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Div,
  Input,
  P,
  Span,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ezstart/ui/components'
import {
  type TokenInfo,
  componentRegistry,
  getTokenNames,
  getStructuralTokens,
  getVisualTokens,
} from '../registry'

type ChainItem = {
  name: string
  level: 'atom' | 'molecule' | 'organism' | 'template'
  tokens: TokenInfo[]
  providesTokens: string[]
  inheritsTokens: string[]
}

type InspectorPreviewProps = {
  chain: ChainItem[]
  tokens: Record<string, string>
}

type CompatibilityResult = {
  flows: string[]
  lost: string[]
  uncontrollable: string[]
  localVisual: string[]
}

const LEVEL_COLORS: Record<string, string> = {
  template: 'border-l-amber-500',
  organism: 'border-l-purple-500',
  molecule: 'border-l-blue-500',
  atom: 'border-l-green-500',
}

const LEVEL_BADGE_VARIANT: Record<string, 'warning' | 'purple' | 'info' | 'success'> = {
  template: 'warning',
  organism: 'purple',
  molecule: 'info',
  atom: 'success',
}

const STANDARD_TOKEN_VALUES: Record<string, string[]> = {
  size: ['xs', 'sm', 'default', 'lg', 'xl'],
  density: ['compact', 'default', 'relaxed'],
  radius: ['none', 'sm', 'default', 'md', 'lg', 'xl', '2xl', '3xl', 'full'],
  intent: ['default', 'primary', 'success', 'warning', 'destructive', 'danger', 'info'],
}

function BadgeWithTooltip({
  values,
  tokenName,
  children,
}: {
  values: string[]
  tokenName?: string
  children: ReactNode
}) {
  const resolvedValues =
    values.length > 0 ? values : tokenName ? STANDARD_TOKEN_VALUES[tokenName] || [] : []
  if (resolvedValues.length === 0) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <Span className="font-mono text-xs">
          ({resolvedValues.length}) {resolvedValues.join(', ')}
        </Span>
      </TooltipContent>
    </Tooltip>
  )
}

function computeCompatibility(parent: ChainItem, child: ChainItem): CompatibilityResult {
  const parentStructural = getStructuralTokens(parent.tokens)
  const childStructural = getStructuralTokens(child.tokens)
  const parentStructuralNames = new Set(parentStructural.map(t => t.name))
  const childStructuralNames = new Set(childStructural.map(t => t.name))

  // Only structural tokens participate in propagation compatibility
  const flows = parentStructural.filter(t => childStructuralNames.has(t.name)).map(t => t.name)
  const lost = parentStructural.filter(t => !childStructuralNames.has(t.name)).map(t => t.name)
  const uncontrollable = childStructural
    .filter(t => !parentStructuralNames.has(t.name))
    .map(t => t.name)

  // Visual tokens are always local — collect unique visual token names across both
  const allVisualNames = new Set([
    ...getVisualTokens(parent.tokens).map(t => t.name),
    ...getVisualTokens(child.tokens).map(t => t.name),
  ])
  const localVisual = [...allVisualNames]

  return { flows, lost, uncontrollable, localVisual }
}

function renderBasePreview(name: string, tokens: Record<string, string>) {
  const size = tokens.size as string | undefined
  const variant = tokens.variant as string | undefined
  const interactive = tokens.interactive === 'true'
  const hover = tokens.hover as 'lift' | 'glow' | 'border' | undefined
  // Button only accepts sm | default | lg | icon
  const buttonSize = (size === 'sm' || size === 'lg' || size === 'icon' ? size : 'default') as
    | 'sm'
    | 'default'
    | 'lg'
    | 'icon'
  // Card sub-components accept xs | sm | default | lg | xl
  const cardSubSize = size as 'xs' | 'sm' | 'default' | 'lg' | 'xl' | undefined
  // Table accepts compact | default | comfortable
  const tableSize = (size === 'sm' ? 'compact' : size === 'lg' ? 'comfortable' : 'default') as
    | 'compact'
    | 'default'
    | 'comfortable'

  switch (name) {
    case 'Button':
      return (
        <Button
          size={buttonSize}
          variant={variant as 'default' | 'outline' | 'ghost' | 'destructive'}
        >
          Sample Button
        </Button>
      )
    case 'Input':
      return <Input placeholder="Sample input..." />
    case 'Card':
      return (
        <Card
          variant={variant as 'default' | 'floating' | 'ghost' | 'outline' | 'elevated' | 'premium'}
          size={cardSubSize}
          interactive={interactive}
          hover={hover}
        >
          <CardHeader size={cardSubSize}>
            <P className="font-semibold">Card Title</P>
            <P className="text-sm text-muted-foreground">Card description</P>
          </CardHeader>
          <CardContent size={cardSubSize}>
            <P>Sample card content with token drilling</P>
          </CardContent>
          <CardFooter size={cardSubSize}>
            <Button
              size={buttonSize}
              variant={variant as 'default' | 'outline' | 'ghost' | 'destructive'}
            >
              Action
            </Button>
          </CardFooter>
        </Card>
      )
    case 'CardHeader':
      return (
        <Card>
          <CardHeader size={cardSubSize}>
            <P className="font-semibold">Card Header Preview</P>
            <P className="text-sm text-muted-foreground">Showing size={size || 'default'}</P>
          </CardHeader>
        </Card>
      )
    case 'CardContent':
      return (
        <Card>
          <CardContent size={cardSubSize}>
            <P>Card content preview with size={size || 'default'}</P>
          </CardContent>
        </Card>
      )
    case 'CardFooter':
      return (
        <Card>
          <CardFooter size={cardSubSize}>
            <Button size={buttonSize} variant="outline">
              Footer Action
            </Button>
          </CardFooter>
        </Card>
      )
    case 'Badge':
      return (
        <Badge
          size={buttonSize as 'sm' | 'default' | 'lg'}
          variant={
            variant as
              | 'default'
              | 'secondary'
              | 'destructive'
              | 'outline'
              | 'success'
              | 'warning'
              | 'info'
              | 'purple'
          }
        >
          Sample Badge
        </Badge>
      )
    case 'Table':
      return (
        <Table variant={variant as 'default' | 'striped' | 'bordered'} size={tableSize}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Alice</TableCell>
              <TableCell>
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Bob</TableCell>
              <TableCell>
                <Badge variant="secondary" size="sm">
                  Inactive
                </Badge>
              </TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    case 'TableRow':
    case 'TableHead':
    case 'TableCell':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column A</TableHead>
              <TableHead>Column B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Cell 1</TableCell>
              <TableCell>Cell 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    default:
      return (
        <Div className="p-4 bg-muted rounded-md space-y-2">
          <P className="text-sm font-medium">{name}</P>
          <Div className="flex flex-wrap gap-1.5">
            {Object.entries(tokens)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <Badge key={k} variant="outline" size="sm">
                  {k}: {v}
                </Badge>
              ))}
          </Div>
          {Object.entries(tokens).filter(([, v]) => v).length === 0 && (
            <P className="text-xs text-muted-foreground">No tokens configured</P>
          )}
        </Div>
      )
  }
}

function renderChain(
  chain: ChainItem[],
  tokens: Record<string, string>,
  depth: number,
  ancestors: ChainItem[] = []
): ReactNode {
  if (chain.length === 0) return null

  const [current, ...rest] = chain
  if (!current) return null

  const isLastInChain = rest.length === 0
  const registryEntry = componentRegistry[current.name]
  const hasRegistryChildren = registryEntry && registryEntry.children.length > 0
  // A molecule/organism/template component at the end of chain should show its children flow, not "applies"
  const isLeaf = isLastInChain && (current.level === 'atom' || !hasRegistryChildren)
  const borderColor = LEVEL_COLORS[current.level] ?? 'border-l-muted'
  const badgeVariant = LEVEL_BADGE_VARIANT[current.level] ?? 'secondary'
  // Build auto-expanded children for molecule/organism/template at end of chain
  const autoExpandedChildren: ChainItem[] = []
  if (isLastInChain && !isLeaf && registryEntry) {
    for (const childName of registryEntry.children) {
      const childEntry = componentRegistry[childName]
      if (childEntry) {
        autoExpandedChildren.push({
          name: childEntry.name,
          level: childEntry.level,
          tokens: childEntry.tokens,
          providesTokens: childEntry.providesTokens,
          inheritsTokens: childEntry.inheritsTokens,
        })
      }
    }
  }

  return (
    <Div
      className={`border-l-4 ${borderColor} rounded-r-lg bg-card/50 p-4 space-y-3`}
      style={{ marginLeft: depth > 0 ? 16 : 0 }}
    >
      {/* Component header */}
      <Div className="flex items-center gap-2 flex-wrap">
        <Badge variant={badgeVariant} size="sm">
          {current.level}
        </Badge>
        <Span className="font-semibold text-foreground">{current.name}</Span>
      </Div>

      {/* Provides / Inherits context tokens */}
      {(current.providesTokens.length > 0 || current.inheritsTokens.length > 0) && (
        <Div className="flex flex-wrap gap-1.5">
          {current.providesTokens.map(t => {
            const nextChild = rest[0]
            const childConsumes = nextChild
              ? nextChild.inheritsTokens.includes(t) || nextChild.tokens.some(tok => tok.name === t)
              : true
            const parentValues = current.tokens.find(tok => tok.name === t)?.values || []
            const childValues =
              nextChild?.tokens.find(tok => tok.name === t)?.values ||
              (nextChild &&
                componentRegistry[nextChild.name]?.tokens.find(tok => tok.name === t)?.values) ||
              []
            const tokenValues = parentValues.length > 0 ? parentValues : childValues
            return (
              <BadgeWithTooltip key={`provides-${t}`} values={tokenValues} tokenName={t}>
                <Badge variant={childConsumes ? 'success' : 'warning'} size="sm">
                  <Span
                    className={
                      childConsumes ? 'text-success-foreground' : 'text-warning-foreground'
                    }
                  >
                    &#8595; {childConsumes ? 'pushes' : 'pushes (ignored)'}
                  </Span>{' '}
                  <Span className="font-mono">{t}</Span>
                </Badge>
              </BadgeWithTooltip>
            )
          })}
          {current.inheritsTokens.map(t => {
            const hasProvider = ancestors.some(a => a.providesTokens.includes(t))
            const registryTokenValues =
              componentRegistry[current.name]?.tokens.find(tok => tok.name === t)?.values || []
            const localTokenValues = current.tokens.find(tok => tok.name === t)?.values || []
            const tokenValues = localTokenValues.length > 0 ? localTokenValues : registryTokenValues
            return (
              <BadgeWithTooltip key={`inherits-${t}`} values={tokenValues} tokenName={t}>
                <Badge variant={hasProvider ? 'success' : 'destructive'} size="sm">
                  <Span
                    className={
                      hasProvider ? 'text-success-foreground' : 'text-destructive-foreground'
                    }
                  >
                    {hasProvider ? '\u2713 receives' : '\u2717'}
                  </Span>{' '}
                  <Span className="font-mono">{t}</Span>
                  {!hasProvider && (
                    <Span className="text-destructive-foreground ml-1">— no provider in chain</Span>
                  )}
                </Badge>
              </BadgeWithTooltip>
            )
          })}
        </Div>
      )}

      {/* Token info — only visual (per-component) tokens and leaf applies */}
      {current.tokens.length > 0 && (
        <Div className="flex flex-wrap gap-1.5">
          {current.tokens
            .filter(tokenInfo => {
              const isStructural = tokenInfo.category === 'structural'
              // On leaf: show all (applies). Otherwise: skip structural (already shown by pushes/receives)
              return isLeaf || !isStructural
            })
            .map(tokenInfo => {
              const isStructural = tokenInfo.category === 'structural'
              const action = isLeaf ? 'applies' : ''
              return (
                <BadgeWithTooltip
                  key={tokenInfo.name}
                  values={tokenInfo.values || []}
                  tokenName={tokenInfo.name}
                >
                  <Badge variant={isLeaf && isStructural ? 'outline' : 'secondary'} size="sm">
                    {action && (
                      <>
                        <Span className="text-success">{action}</Span>{' '}
                      </>
                    )}
                    <Span className="font-mono">{tokenInfo.name}</Span>
                    {tokens[tokenInfo.name] && (
                      <Span className="text-primary ml-1">= {tokens[tokenInfo.name]}</Span>
                    )}
                  </Badge>
                </BadgeWithTooltip>
              )
            })}
        </Div>
      )}

      {/* Composition slots (required vs optional) for molecule/organism/template at end of chain */}
      {isLastInChain &&
        !isLeaf &&
        registryEntry &&
        (() => {
          const hasSlots = registryEntry.slots.length > 0
          const parentStructuralNames = getStructuralTokens(current.tokens).map(t => t.name)

          if (hasSlots) {
            // Use slots: shows required vs optional with expected components
            const requiredSlots = registryEntry.slots.filter(s => s.required)
            const optionalSlots = registryEntry.slots.filter(s => !s.required)

            return (
              <Div className="py-2 px-3 space-y-3 bg-muted/30 rounded-md border border-border/50">
                <P className="text-xs font-medium text-muted-foreground">Composition slots</P>

                {requiredSlots.length > 0 && (
                  <Div className="space-y-1.5">
                    <P className="text-[10px] uppercase tracking-wider text-destructive font-medium">
                      Required
                    </P>
                    {requiredSlots.map(slot => (
                      <Div key={slot.name} className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="destructive" size="sm">
                          <Span className="font-mono">{slot.name}</Span>
                        </Badge>
                        {slot.expectedComponents.map(comp => {
                          const compEntry = componentRegistry[comp]
                          const compTokens = compEntry?.tokens.map(t => t.name) ?? []
                          const receives = compTokens.filter(t => parentStructuralNames.includes(t))
                          return (
                            <Badge key={comp} variant="outline" size="sm">
                              <Span className="font-mono">{comp}</Span>
                              {receives.length > 0 && (
                                <Span className="ml-1 text-success">← {receives.join(', ')}</Span>
                              )}
                            </Badge>
                          )
                        })}
                      </Div>
                    ))}
                  </Div>
                )}

                {optionalSlots.length > 0 && (
                  <Div className="space-y-1.5">
                    <P className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Optional
                    </P>
                    {optionalSlots.map(slot => (
                      <Div key={slot.name} className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" size="sm">
                          <Span className="font-mono">{slot.name}?</Span>
                        </Badge>
                        {slot.expectedComponents.map(comp => {
                          const compEntry = componentRegistry[comp]
                          const compTokens = compEntry?.tokens.map(t => t.name) ?? []
                          const receives = compTokens.filter(t => parentStructuralNames.includes(t))
                          return (
                            <Badge key={comp} variant="outline" size="sm">
                              <Span className="font-mono">{comp}</Span>
                              {receives.length > 0 && (
                                <Span className="ml-1 text-success">← {receives.join(', ')}</Span>
                              )}
                            </Badge>
                          )
                        })}
                      </Div>
                    ))}
                  </Div>
                )}

                <P className="text-[10px] text-muted-foreground italic">
                  Use &quot;Add to Chain&quot; below to inspect token drilling
                </P>
              </Div>
            )
          }

          // Fallback: no slots defined, show children as all optional
          if (autoExpandedChildren.length > 0) {
            return (
              <Div className="py-2 px-3 space-y-2 bg-muted/30 rounded-md border border-border/50">
                <P className="text-xs font-medium text-muted-foreground">
                  Children ({autoExpandedChildren.length}) — all optional
                </P>
                <Div className="flex flex-wrap gap-1.5">
                  {autoExpandedChildren.map(child => {
                    const childTokenNames = child.tokens.map(t => t.name)
                    const receives = childTokenNames.filter(t => parentStructuralNames.includes(t))
                    return (
                      <Badge key={child.name} variant="outline" size="sm">
                        <Span className="font-mono">{child.name}</Span>
                        {receives.length > 0 && (
                          <Span className="ml-1 text-success">← {receives.join(', ')}</Span>
                        )}
                      </Badge>
                    )
                  })}
                </Div>
                <P className="text-[10px] text-muted-foreground italic">
                  Use &quot;Add to Chain&quot; below to inspect token drilling
                </P>
              </Div>
            )
          }

          return null
        })()}

      {/* Rendered preview or next in chain */}
      {isLastInChain ? (
        <Div className="mt-3 p-4 bg-background rounded-lg border border-border">
          <P className="text-xs text-muted-foreground mb-2">Rendered output:</P>
          {renderBasePreview(current.name, tokens)}
        </Div>
      ) : (
        renderChain(rest, tokens, depth + 1, [...ancestors, current])
      )}
    </Div>
  )
}

export function InspectorPreview({ chain, tokens }: InspectorPreviewProps) {
  if (chain.length === 0) {
    return (
      <Div className="flex items-center justify-center p-8">
        <P className="text-muted-foreground">Select a component chain to inspect</P>
      </Div>
    )
  }

  return <Div className="space-y-2">{renderChain(chain, tokens, 0)}</Div>
}

export { computeCompatibility }
export type { ChainItem, InspectorPreviewProps, CompatibilityResult }
