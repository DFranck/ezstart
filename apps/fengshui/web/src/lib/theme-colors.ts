/**
 * Centralized theme colors for FengShui app
 *
 * Pour changer le thème : modifie les CSS variables --fengshui-* dans @ezstart/ui/globals.css
 * Ce fichier lit dynamiquement les CSS variables définies dans globals.css
 */

export const THEME_COLORS = {
  // CSS Variables (pour usage dans style objects - compatible SSR)
  cssVars: {
    primary: 'var(--fengshui-primary)',
    secondary: 'var(--fengshui-secondary)',
    primaryDark: 'var(--fengshui-primary-dark)',
    secondaryDark: 'var(--fengshui-secondary-dark)',
  },
  // Classes Tailwind utilisant les CSS variables
  gradient: {
    from: 'from-fengshui-primary',
    to: 'to-fengshui-secondary',
    hover: {
      from: 'hover:from-fengshui-primary-dark',
      to: 'hover:to-fengshui-secondary-dark',
    },
  },
  gradientClasses: 'from-fengshui-primary to-fengshui-secondary',
  gradientHoverClasses: 'hover:from-fengshui-primary-dark hover:to-fengshui-secondary-dark',
  buttonGradient:
    'from-fengshui-primary to-fengshui-secondary hover:from-fengshui-primary-dark hover:to-fengshui-secondary-dark',
} as const

/**
 * Helper function to get gradient classes
 */
export function getGradientClasses(includeHover = true) {
  const base = `${THEME_COLORS.gradient.from} ${THEME_COLORS.gradient.to}`
  const hover = includeHover
    ? ` ${THEME_COLORS.gradient.hover.from} ${THEME_COLORS.gradient.hover.to}`
    : ''
  return base + hover
}

/**
 * Pre-built class strings for common use cases
 */
export const GRADIENT_BG = `bg-gradient-to-r ${THEME_COLORS.buttonGradient}`
export const GRADIENT_TEXT = `bg-gradient-to-r ${THEME_COLORS.gradientClasses} bg-clip-text text-transparent`

/**
 * Helper to get gradient background style with opacity (pour CSS inline)
 * Retourne un objet style React avec backgroundImage
 */
export function getGradientWithOpacity(opacity: number = 20, direction: 'br' | 'tr' = 'br') {
  const alpha = opacity / 100
  return {
    backgroundImage: `linear-gradient(to ${direction === 'br' ? 'bottom right' : 'top right'},
      color-mix(in oklch, var(--fengshui-primary) ${opacity}%, transparent),
      color-mix(in oklch, var(--fengshui-secondary) ${opacity}%, transparent))`,
  }
}
