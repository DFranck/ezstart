/**
 * BASE level — Primitive components with NO UI component dependencies.
 * These components only depend on external libs (radix, react, etc.) and internal utils (cn, variants).
 * They do NOT import from other @ezstart/ui components.
 *
 * This file re-exports from current locations to provide atomic-level organization
 * without physically moving files.
 */

// ─── Root-level ───────────────────────────────────────────
export * from '../animated-icon-toggle'
export * from '../button'

// ─── Forms ────────────────────────────────────────────────
export * from '../forms/input'
export * from '../forms/label'
export * from '../forms/select'
export * from '../forms/switch'
export * from '../forms/textarea'

// ─── Feedback ─────────────────────────────────────────────
export * from '../feedback/progress'
export * from '../feedback/skeleton'
export * from '../feedback/sonner'
export * from '../feedback/spinner'
export * from '../feedback/tooltip'

// ─── Data Display ─────────────────────────────────────────
export * from '../data-display/badge'
export * from '../data-display/card'
export * from '../data-display/simple-badge'
export * from '../data-display/table'

// ─── Overlay ──────────────────────────────────────────────
export * from '../overlay/dialog'
export * from '../overlay/modal'
export * from '../overlay/sheet'

// ─── Navigation ───────────────────────────────────────────
export * from '../navigation/tabs'

// ─── Media ────────────────────────────────────────────────
export * from '../media/chart'
export * from '../media/image-cropper'
export * from '../media/img'
export * from '../media/uptime-graph'

// ─── Effects ──────────────────────────────────────────────
export * from '../effects/animated-counter'
export * from '../effects/aurora-background'
export * from '../effects/background-gradient-animation'
export * from '../effects/infinite-moving-cards'
export * from '../effects/text-gradient'
export * from '../effects/typewriter-effect'

// ─── Landing (base only — stats has no UI deps; faq depends on accordion) ───
export { Stats as LandingStats } from '../landing/stats'
export type { StatsProps as LandingStatsProps, Stat } from '../landing/stats'

// ─── Utility ──────────────────────────────────────────────
export * from '../utility/analytics'
export * from '../utility/debugBanner'
export * from '../utility/debug-panel'
export * from '../utility/flow-connector'
export * from '../utility/service-card'
export * from '../utility/skip-link'
export { Span } from '../utility/span'

// ─── Tag system (entire directory) ────────────────────────
export * from '../tag'

// ─── Icon system (entire directory) ───────────────────────
export * from '../icon'

// ─── Thread (base components only — no UI deps) ──────────
export { Thread } from '../thread/Thread'
export { ThreadHeader } from '../thread/ThreadHeader'
export { ThreadWelcome } from '../thread/ThreadWelcome'
export { useThreadLayout } from '../thread/ThreadLayoutContext'
export { ThreadThemeProvider, useThreadTheme } from '../thread/ThreadThemeContext'
export { threadThemes, getThreadTheme, mergeThreadTheme } from '../thread/thread-themes'
export * from '../thread/types'
