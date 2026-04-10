import type { DesignTokens } from './DesignTokenContext'

/**
 * Design token presets — predefined token combinations for common layouts.
 *
 * Apps use presets at the layout level to set sensible defaults:
 * ```tsx
 * <DesignTokenProvider preset="dashboard">
 *   {children}
 * </DesignTokenProvider>
 * ```
 */
export const designPresets: Record<string, DesignTokens> = {
  /** Dashboard: compact layout, small elements, medium radius */
  dashboard: {
    density: 'compact',
    size: 'default',
    radius: 'md',
  },
  /** Landing page: relaxed spacing, larger elements, rounded */
  landing: {
    density: 'relaxed',
    size: 'lg',
    radius: 'lg',
  },
  /** Form-heavy: default density, focused on readability */
  form: {
    density: 'default',
    size: 'default',
    radius: 'default',
  },
  /** Compact data view: tight spacing, small elements */
  data: {
    density: 'compact',
    size: 'sm',
    radius: 'sm',
  },
  /** Admin panel: compact but readable */
  admin: {
    density: 'compact',
    size: 'default',
    radius: 'default',
  },
}

/** Get a preset by name, returns empty object if not found */
export function getPreset(name: string): DesignTokens {
  return designPresets[name] ?? {}
}
