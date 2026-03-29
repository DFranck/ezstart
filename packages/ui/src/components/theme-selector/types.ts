export type ColorFormat = 'oklch' | 'hex' | 'rgb'

export type ThemeVariableCategory =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'status'
  | 'platform'
  | 'custom'

export interface ThemeVariable {
  name: string
  value: string
  category: ThemeVariableCategory
  description?: string
}

export interface ThemeConfig {
  variables: ThemeVariable[]
  metadata?: {
    appName: string
    version?: string
  }
}

export interface ThemeOverrides {
  appName: string
  overrides: Record<string, string>
  updatedAt: string
  updatedBy?: string
}

/** Props for ThemeEditor component */
export interface ThemeEditorProps {
  /** Global CSS variables (from globals.css) */
  globalCss: string

  /** App-specific CSS variables (from themes/app-name.css) */
  appCss: string

  /** App name for API routing (e.g., 'green-pulse', 'ezbill') */
  appName: string

  /** Current theme mode ('light' | 'dark') from next-themes */
  currentTheme?: 'light' | 'dark'

  /** API endpoint for theme operations (default: '/theme') */
  apiEndpoint?: string

  /** Only show for admin users */
  adminOnly?: boolean

  /** Callback when theme is saved successfully */
  onSave?: (overrides: Record<string, string>) => void

  /** Callback when an error occurs */
  onError?: (error: Error) => void

  /** Enable undo/redo functionality */
  enableHistory?: boolean

  /** Show preset themes */
  showPresets?: boolean
  /** Theme switcher component */
  themeSwitcher?: React.ReactNode

  /** Auth state getter for admin-only access check (replaces window global coupling) */
  getAuthState?: () => {
    user: { roles?: string[]; permissions?: string[] } | null
    isAuthenticated: boolean
  }
}

/** @deprecated Use ThemeEditorProps instead */
export interface ThemeSelectorProps extends ThemeEditorProps {}

export interface UseThemeOptions {
  appName: string
  defaultTheme: ThemeConfig
  apiEndpoint?: string
  onError?: (error: Error) => void
}

export interface UseThemeEditorOptions {
  enableHistory?: boolean
  onSave?: (overrides: Record<string, string>) => void
  onError?: (error: Error) => void
}

export interface ThemeHistoryEntry {
  timestamp: number
  overrides: Record<string, string>
  description?: string
}
