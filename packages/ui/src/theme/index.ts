export { ThemeProvider } from './theme-provider.js'
export type { ThemeProviderProps } from './theme-provider.js'
export { ThemeSelectorProvider, useThemeSelectorContext } from './theme-selector-context.js'
export type { ThemeSelectorContextValue } from './theme-selector-context.js'
export { ThemeSwitcher } from './components/ThemeSwitcher.js'

/**
 * Re-export `useTheme` from `next-themes` so consumer apps can read the
 * current theme via the `@ezstart/ui/theme` import surface alone — no need
 * to add `next-themes` as a direct dependency in every web app.
 */
export { useTheme } from 'next-themes'
