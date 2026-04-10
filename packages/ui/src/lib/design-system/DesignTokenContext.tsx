'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { getPreset } from './presets'

/**
 * Design Token Context — @ezstart/ui
 *
 * Propagates structural tokens (size, density) automatically through the tree.
 * Visual tokens (variant, colorScheme) can be propagated explicitly.
 *
 * Rules:
 * - Explicit prop on a component ALWAYS wins over inherited value
 * - Structural tokens (size, density) auto-propagate by default
 * - Visual tokens (variant, colorScheme) are local unless explicitly provided
 * - Nesting is supported: inner provider merges with outer (inner wins)
 *
 * @example
 * // Container pushes tokens down
 * <Card size="sm" variant="floating">
 *   <CardHeader />       // inherits size="sm"
 *   <CardContent>
 *     <Button />         // inherits size="sm"
 *     <Badge />          // inherits size="sm"
 *   </CardContent>
 * </Card>
 *
 * @example
 * // Override at any level
 * <Card size="sm">
 *   <CardContent>
 *     <Button size="lg" /> // explicit prop wins, size="lg"
 *   </CardContent>
 * </Card>
 */

export type DesignTokens = {
  /** Structural tokens — auto-propagate through the tree */
  size?: string
  density?: string
  radius?: string

  /** Semantic tokens — propagate to set the "mood" of a subtree */
  intent?: string

  /** Visual tokens — propagate only when explicitly set */
  variant?: string
  colorScheme?: string
}

const DesignTokenCtx = createContext<DesignTokens>({})

type DesignTokenProviderProps = {
  children: ReactNode
  /** Apply a named preset (dashboard, landing, form, data, admin) */
  preset?: string
} & DesignTokens

/**
 * DesignTokenProvider — wraps children to propagate design tokens.
 *
 * Used internally by container components (Card, Table, Dialog, ThreadLayout).
 * You can also use it directly to set tokens for a subtree.
 *
 * Merges with parent context: inner values override outer values.
 * Undefined values are NOT propagated (parent value preserved).
 */
export function DesignTokenProvider({
  children,
  preset,
  size,
  density,
  radius,
  intent,
  variant,
  colorScheme,
}: DesignTokenProviderProps) {
  const parent = useContext(DesignTokenCtx)
  const presetTokens = preset ? getPreset(preset) : {}

  const merged = useMemo(() => {
    // Priority: explicit prop > preset > parent context
    const next: DesignTokens = { ...parent }

    // Apply preset values (lower priority than explicit props)
    if (presetTokens.size !== undefined && size === undefined) next.size = presetTokens.size
    if (presetTokens.density !== undefined && density === undefined)
      next.density = presetTokens.density
    if (presetTokens.radius !== undefined && radius === undefined)
      next.radius = presetTokens.radius
    if (presetTokens.intent !== undefined && intent === undefined)
      next.intent = presetTokens.intent
    if (presetTokens.variant !== undefined && variant === undefined)
      next.variant = presetTokens.variant
    if (presetTokens.colorScheme !== undefined && colorScheme === undefined)
      next.colorScheme = presetTokens.colorScheme

    // Apply explicit props (highest priority)
    if (size !== undefined) next.size = size
    if (density !== undefined) next.density = density
    if (radius !== undefined) next.radius = radius
    if (intent !== undefined) next.intent = intent
    if (variant !== undefined) next.variant = variant
    if (colorScheme !== undefined) next.colorScheme = colorScheme

    return next
  }, [parent, preset, size, density, radius, intent, variant, colorScheme])

  return <DesignTokenCtx.Provider value={merged}>{children}</DesignTokenCtx.Provider>
}

/**
 * useDesignTokens — read inherited design tokens from the nearest provider.
 *
 * Used internally by leaf components (Button, Badge, Input, CardHeader, etc.)
 * to inherit structural tokens from their container.
 *
 * @example
 * function Button({ size: sizeProp, variant: variantProp, ...props }) {
 *   const inherited = useDesignTokens()
 *   const size = sizeProp ?? inherited.size ?? 'default'
 *   const variant = variantProp ?? inherited.variant ?? 'default'
 *   // ...
 * }
 */
export function useDesignTokens(): DesignTokens {
  return useContext(DesignTokenCtx)
}
