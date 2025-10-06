/**
 * Centralized theme colors for FengShui app
 * Change colors here to update them throughout the entire app
 */

export const THEME_COLORS = {
  // Primary gradient (used for buttons, headers, etc.)
  gradient: {
    from: 'from-blue-500',
    to: 'to-green-500',
    hover: {
      from: 'hover:from-blue-600',
      to: 'hover:to-green-600',
    },
  },

  // Tailwind class string for easy spreading
  gradientClasses: 'from-blue-500 to-green-500',
  gradientHoverClasses: 'hover:from-blue-600 hover:to-green-600',

  // Combined for buttons
  buttonGradient: 'from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600',
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
