'use client'

import { use, useMemo, useState } from 'react'
import { Badge, Card, CardContent, CardHeader, Div, H1, H2, P, Span } from '@ezstart/ui/components'
import Link from 'next/link'
import { getComponent, type TokenInfo, type SlotInfo } from '../../registry'
import { InspectorControls } from '../../components/inspector-controls'
import { TreeNode, collectAllTokens } from '../../components/tree-node'

function getDefaultTokenValues(tokens: TokenInfo[]): Record<string, string> {
  const defaults: Record<string, string> = {}
  for (const token of tokens) {
    defaults[token.name] = 'default'
  }
  return defaults
}

function CompositionDiagnostic({
  entry,
}: {
  entry: { level: string; slots: SlotInfo[]; children: string[] }
}) {
  const isComplex = entry.level === 'organism' || entry.level === 'template'
  const hasSlots = entry.slots.length > 0
  const hasImportedChildren = entry.children.length > 0
  const compositionSlots = entry.slots.filter(s => !s.isRenderProp)
  const renderProps = entry.slots.filter(s => s.isRenderProp)

  // Complex with no slots at all = tightly coupled
  if (isComplex && !hasSlots && hasImportedChildren) {
    return (
      <Div className="mt-1.5">
        <Badge variant="warning" size="sm">
          <Span className="text-[10px]">No composition slots — may be tightly coupled</Span>
        </Badge>
      </Div>
    )
  }

  // Show composition summary when slots exist
  if (hasSlots) {
    return (
      <Div className="mt-1.5 flex flex-wrap gap-1">
        {compositionSlots.length > 0 && (
          <Badge variant="info" size="sm">
            <Span className="text-[10px]">
              {compositionSlots.length} slot{compositionSlots.length > 1 ? 's' : ''}
            </Span>
          </Badge>
        )}
        {renderProps.length > 0 && (
          <Badge variant="secondary" size="sm">
            <Span className="text-[10px]">
              {renderProps.length} render prop{renderProps.length > 1 ? 's' : ''}
            </Span>
          </Badge>
        )}
      </Div>
    )
  }

  return null
}

export default function TreeExplorerPage({
  params: paramsPromise,
}: {
  params: Promise<{ component: string; locale: string }>
}) {
  const params = use(paramsPromise)
  const componentName = params.component
  const locale = params.locale

  const entry = useMemo(() => getComponent(componentName), [componentName])

  const allTokens = useMemo(() => {
    return collectAllTokens(componentName)
  }, [componentName])

  const [tokens, setTokens] = useState<Record<string, string>>(() =>
    getDefaultTokenValues(allTokens)
  )

  const handleTokenChange = (tokenName: string, value: string) => {
    setTokens(prev => ({ ...prev, [tokenName]: value }))
  }

  if (!entry) {
    return (
      <Div className="max-w-3xl mx-auto px-4 py-8 text-center space-y-4">
        <H1 className="text-2xl font-bold">Component Not Found</H1>
        <P className="text-muted-foreground">
          The component &quot;{componentName}&quot; is not in the registry.
        </P>
        <Link href={`/${locale}/packages/ui/inspector`}>
          <Badge variant="secondary" className="cursor-pointer hover:bg-accent px-3 py-1.5">
            Back to Inspector
          </Badge>
        </Link>
      </Div>
    )
  }

  const levelBadgeVariant: Record<string, 'purple' | 'info' | 'success'> = {
    complex: 'purple',
    composed: 'info',
    base: 'success',
  }

  return (
    <Div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <Div className="space-y-3">
        <Link href={`/${locale}/packages/ui/inspector`}>
          <Span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            &larr; Inspector
          </Span>
        </Link>

        <H1 className="text-2xl font-bold flex items-center gap-3">
          <Span>Tree Explorer:</Span>
          <Badge variant={levelBadgeVariant[entry.level] ?? 'secondary'}>{entry.name}</Badge>
        </H1>

        <P className="text-muted-foreground text-sm">
          Full recursive tree of all children from {entry.name}. Tokens propagate through the entire
          hierarchy.
        </P>
      </Div>

      {/* Main layout: controls + tree */}
      <Div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Div className="lg:col-span-1 space-y-4">
          <Card variant="default">
            <CardHeader className="pb-2">
              <H2 className="text-sm uppercase tracking-wider text-muted-foreground">
                Token Controls
              </H2>
            </CardHeader>
            <CardContent>
              {allTokens.length > 0 ? (
                <InspectorControls
                  tokens={tokens}
                  availableTokens={allTokens}
                  onChange={handleTokenChange}
                />
              ) : (
                <P className="text-sm text-muted-foreground italic">
                  No configurable tokens in this tree
                </P>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card variant="default">
            <CardHeader className="pb-2">
              <H2 className="text-sm uppercase tracking-wider text-muted-foreground">Legend</H2>
            </CardHeader>
            <CardContent className="space-y-2">
              <Div className="flex items-center gap-2">
                <Badge variant="success" size="sm">
                  flows
                </Badge>
                <Span className="text-xs text-muted-foreground">
                  Token propagates through DesignTokenProvider
                </Span>
              </Div>
              <Div className="flex items-center gap-2">
                <Badge variant="warning" size="sm">
                  ignored
                </Badge>
                <Span className="text-xs text-muted-foreground">
                  Parent provides, but child has no matching prop
                </Span>
              </Div>
              <Div className="flex items-center gap-2">
                <Badge variant="destructive" size="sm">
                  unwired
                </Badge>
                <Span className="text-xs text-muted-foreground">
                  Child inherits via useDesignTokens, but no ancestor provides it — needs
                  DesignTokenProvider
                </Span>
              </Div>
              <Div className="flex items-center gap-2">
                <Badge variant="secondary" size="sm">
                  local
                </Badge>
                <Span className="text-xs text-muted-foreground">
                  Visual token — scoped to this component, no propagation
                </Span>
              </Div>
              <Div className="flex items-center gap-2">
                <Badge variant="warning" size="sm">
                  already shown above
                </Badge>
                <Span className="text-xs text-muted-foreground">
                  Circular reference, recursion stopped
                </Span>
              </Div>
              <Div className="flex items-center gap-2">
                <Span className="text-sm">&#x1F4E6;</Span>
                <Badge variant="secondary" size="sm">
                  slot
                </Badge>
                <Span className="text-xs text-muted-foreground">ReactNode composition slot</Span>
              </Div>
              <Div className="flex items-center gap-2">
                <Span className="text-sm">&#x1F527;</Span>
                <Badge variant="secondary" size="sm">
                  render prop
                </Badge>
                <Span className="text-xs text-muted-foreground">Function returning ReactNode</Span>
              </Div>
            </CardContent>
          </Card>
        </Div>

        {/* Tree view */}
        <Div className="lg:col-span-2">
          <Card variant="floating" className="min-h-[500px]">
            <CardHeader className="pb-2">
              <H2 className="text-sm uppercase tracking-wider text-muted-foreground">
                Component Tree
              </H2>
              <P className="text-xs text-muted-foreground">
                {entry.children.length} direct children
                {entry.slots.length > 0 &&
                  ` \u00B7 ${entry.slots.length} composition slot${entry.slots.length > 1 ? 's' : ''}`}
              </P>
              {/* Composition diagnostic */}
              <CompositionDiagnostic entry={entry} />
            </CardHeader>
            <CardContent>
              <Div className="font-mono text-sm overflow-x-auto">
                <TreeNode
                  componentName={componentName}
                  tokens={tokens}
                  depth={0}
                  visited={new Set<string>()}
                  isLast={true}
                  ancestors={[]}
                />
              </Div>
            </CardContent>
          </Card>
        </Div>
      </Div>
    </Div>
  )
}
