'use client'

import { use, useMemo, useState } from 'react'
import { Badge, Card, CardContent, CardHeader, Div, H1, H2, P, Span } from '@ezstart/ui/components'
import Link from 'next/link'
import {
  componentRegistry,
  getComponent,
  getTokenNames,
  type ComponentEntry,
  type ComponentLevel,
  type TokenInfo,
} from '../registry'
import { InspectorControls } from '../components/inspector-controls'
import { InspectorPreview } from '../components/inspector-preview'

const levelOrder: Record<ComponentLevel, number> = {
  complex: 0,
  composed: 1,
  base: 2,
}

const levelBadgeVariant: Record<ComponentLevel, 'success' | 'info' | 'purple'> = {
  base: 'success',
  composed: 'info',
  complex: 'purple',
}

function getDefaultTokenValues(chain: ComponentEntry[]): Record<string, string> {
  const allTokenNames = new Set<string>()
  for (const entry of chain) {
    for (const token of entry.tokens) {
      allTokenNames.add(token.name)
    }
  }

  const defaults: Record<string, string> = {}
  for (const name of allTokenNames) {
    defaults[name] = 'default'
  }
  return defaults
}

function validateChainOrder(entries: ComponentEntry[]): string[] {
  const warnings: string[] = []

  for (let i = 0; i < entries.length - 1; i++) {
    const current = entries[i]
    const next = entries[i + 1]
    if (current && next && levelOrder[current.level] > levelOrder[next.level]) {
      warnings.push(
        `"${current.name}" (${current.level}) appears before "${next.name}" (${next.level}) — expected complex > composed > base order`
      )
    }
  }

  return warnings
}

export default function InspectorChainPage({
  params: paramsPromise,
}: {
  params: Promise<{ chain: string[]; locale: string }>
}) {
  const params = use(paramsPromise)
  const chainNames = params.chain
  const locale = params.locale

  const chainEntries = useMemo(() => {
    return chainNames
      .map(name => getComponent(name))
      .filter((entry): entry is ComponentEntry => entry !== undefined)
  }, [chainNames])

  const unknownNames = useMemo(() => {
    return chainNames.filter(name => !componentRegistry[name])
  }, [chainNames])

  const warnings = useMemo(() => validateChainOrder(chainEntries), [chainEntries])

  const allTokens = useMemo(() => {
    const seen = new Set<string>()
    const tokens: TokenInfo[] = []
    for (const entry of chainEntries) {
      for (const token of entry.tokens) {
        if (!seen.has(token.name)) {
          seen.add(token.name)
          tokens.push(token)
        }
      }
    }
    return tokens
  }, [chainEntries])

  const [tokens, setTokens] = useState<Record<string, string>>(() =>
    getDefaultTokenValues(chainEntries)
  )

  const handleTokenChange = (tokenName: string, value: string) => {
    setTokens(prev => ({ ...prev, [tokenName]: value }))
  }

  if (chainEntries.length === 0) {
    return (
      <Div withHeaderOffset className="max-w-3xl mx-auto px-4 py-8 text-center space-y-4">
        <H1 className="text-2xl font-bold">No Components Found</H1>
        <P className="text-muted-foreground">
          None of the requested components ({chainNames.join(', ')}) are in the registry.
        </P>
        <Link href={`/${locale}/packages/ui/inspector`}>
          <Badge variant="secondary" className="cursor-pointer hover:bg-accent px-3 py-1.5">
            Back to Inspector
          </Badge>
        </Link>
      </Div>
    )
  }

  return (
    <Div withHeaderOffset className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Chain breadcrumb */}
      <Div className="space-y-3">
        <Link href={`/${locale}/packages/ui/inspector`}>
          <Span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            &larr; Inspector
          </Span>
        </Link>

        <H1 className="text-2xl font-bold">Token Flow Inspector</H1>

        <Div className="flex flex-wrap items-center gap-2">
          {chainEntries.map((entry, index) => (
            <Div key={entry.name} className="flex items-center gap-2">
              {index > 0 && <Span className="text-muted-foreground">&rarr;</Span>}
              <Link href={`/${locale}/packages/ui/inspector/${entry.name}`}>
                <Badge
                  variant={levelBadgeVariant[entry.level]}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {entry.name}
                </Badge>
              </Link>
            </Div>
          ))}
        </Div>

        {unknownNames.length > 0 && (
          <P className="text-sm text-destructive">
            Unknown components skipped: {unknownNames.join(', ')}
          </P>
        )}

        {warnings.length > 0 && (
          <Div className="space-y-1">
            {warnings.map((w, i) => (
              <P key={i} className="text-sm text-warning">
                {w}
              </P>
            ))}
          </Div>
        )}
      </Div>

      {/* Main layout: controls + preview */}
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
                  No configurable tokens in this chain
                </P>
              )}
            </CardContent>
          </Card>

          {/* Chain details */}
          <Card variant="default">
            <CardHeader className="pb-2">
              <H2 className="text-sm uppercase tracking-wider text-muted-foreground">
                Chain Details
              </H2>
            </CardHeader>
            <CardContent className="space-y-3">
              {chainEntries.map(entry => (
                <Div key={entry.name} className="space-y-1">
                  <Div className="flex items-center gap-2">
                    <Span className="font-medium text-sm">{entry.name}</Span>
                    <Badge variant={levelBadgeVariant[entry.level]} size="sm">
                      {entry.level}
                    </Badge>
                  </Div>
                  {entry.description && (
                    <P className="text-xs text-muted-foreground">{entry.description}</P>
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
                          <Span className="ml-1 text-muted-foreground text-[10px]">
                            {token.category === 'structural' ? 'propagates' : 'local'}
                          </Span>
                        </Badge>
                      ))}
                    </Div>
                  )}
                </Div>
              ))}
            </CardContent>
          </Card>
        </Div>

        {/* Preview */}
        <Div className="lg:col-span-2">
          <Card variant="floating" className="min-h-[500px]">
            <CardHeader className="pb-2">
              <H2 className="text-sm uppercase tracking-wider text-muted-foreground">Preview</H2>
            </CardHeader>
            <CardContent>
              <InspectorPreview chain={chainEntries} tokens={tokens} />
            </CardContent>
          </Card>
        </Div>
      </Div>

      {/* Add to chain — suggest children of last component */}
      {(() => {
        const lastEntry = chainEntries[chainEntries.length - 1]
        if (!lastEntry?.children || lastEntry.children.length === 0) return null

        const currentChainPath = chainEntries.map(e => e.name).join('/')

        return (
          <Card variant="default">
            <CardHeader className="pb-2">
              <H2 className="text-sm uppercase tracking-wider text-muted-foreground">
                Add to Chain
              </H2>
              <P className="text-xs text-muted-foreground">
                Suggested children of {lastEntry.name}
              </P>
            </CardHeader>
            <CardContent>
              <Div className="flex flex-wrap gap-2">
                {lastEntry.children.map(childName => {
                  const childEntry = getComponent(childName)
                  const variant = childEntry
                    ? levelBadgeVariant[childEntry.level]
                    : ('secondary' as const)
                  return (
                    <Link
                      key={childName}
                      href={`/${locale}/packages/ui/inspector/${currentChainPath}/${childName}`}
                    >
                      <Badge
                        variant={variant}
                        className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5"
                      >
                        + {childName}
                      </Badge>
                    </Link>
                  )
                })}
              </Div>
            </CardContent>
          </Card>
        )
      })()}
    </Div>
  )
}
