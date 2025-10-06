/**
 * Centralized theme colors for FengShui app
 *
 * Pour changer le thème : modifie uniquement les valeurs oklch() dans src/styles/theme.css
 * Ce fichier lit dynamiquement les CSS variables définies dans theme.css
 */

/**
 * Récupère une couleur CSS variable et la convertit en hex
 * Fallback vers une valeur par défaut si pas disponible (SSR)
 */
function getCSSColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback // SSR
  const root = getComputedStyle(document.documentElement)
  const value = root.getPropertyValue(varName).trim()
  return value || fallback
}

export const THEME_COLORS = {
  // Hex colors dynamiques (lus depuis CSS variables)
  get hex() {
    return {
      primary: getCSSColor('--fengshui-primary', '#3b82f6'),
      secondary: getCSSColor('--fengshui-secondary', '#22c55e'),
      primaryDark: getCSSColor('--fengshui-primary-dark', '#2563eb'),
      secondaryDark: getCSSColor('--fengshui-secondary-dark', '#16a34a'),
    }
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
