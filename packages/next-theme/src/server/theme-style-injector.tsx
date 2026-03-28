/**
 * Server Component that injects theme overrides as <style> tag
 * Prevents theme flash by loading CSS during SSR
 */

import { fetchThemeOverrides, generateThemeCSS } from './fetch-theme-overrides'

export interface ThemeStyleInjectorProps {
  /** App name to fetch theme for */
  appName: 'green-pulse' | 'ezbill' | 'ezauth' | 'ezpay' | 'ezstart' | 'fengshui'
}

/**
 * Server Component that fetches and injects theme overrides
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { ThemeStyleInjector } from '@ezstart/next-theme/server'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <ThemeStyleInjector appName="green-pulse" />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   )
 * }
 * ```
 */
export async function ThemeStyleInjector({ appName }: ThemeStyleInjectorProps) {
  // Fetch theme overrides server-side
  const { overrides } = await fetchThemeOverrides(appName)

  // Generate CSS from overrides
  const css = generateThemeCSS(overrides)

  // If no overrides, don't render anything
  if (!css) {
    return null
  }

  // Inject CSS as <style> tag
  return (
    <style
      id="theme-overrides-ssr"
      dangerouslySetInnerHTML={{ __html: css }}
      // Suppress hydration warning - this style tag is replaced by client-side version
      suppressHydrationWarning
    />
  )
}
