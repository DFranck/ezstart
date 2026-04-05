const defaultContent = [
  // Next.js app directory
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  // Next.js pages directory (legacy)
  './pages/**/*.{js,ts,jsx,tsx,mdx}',
  // Components directory
  './components/**/*.{js,ts,jsx,tsx,mdx}',
  // Src directory (for apps using src folder)
  './src/**/*.{js,ts,jsx,tsx,mdx}',
  // Shared packages from monorepo (only those with React components using Tailwind)
  '../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}',
]

const themeExtend = {
  animation: {
    'spin-slow': 'spin 2s linear infinite',
    'spin-fast': 'spin 0.5s linear infinite',
    shimmer: 'shimmer 2s linear infinite',
  },
  keyframes: {
    shimmer: {
      '0%': { backgroundPosition: '200% 0' },
      '100%': { backgroundPosition: '-200% 0' },
    },
  },
  spacing: {
    'safe-top': 'env(safe-area-inset-top)',
    'safe-bottom': 'env(safe-area-inset-bottom)',
    'safe-left': 'env(safe-area-inset-left)',
    'safe-right': 'env(safe-area-inset-right)',
  },
}

/** @param {string[]} extraContent - additional content paths */
export function createTailwindConfig(extraContent = []) {
  return {
    content: [...defaultContent, ...extraContent],
    theme: { extend: themeExtend },
    plugins: [],
  }
}

/** @type {import('tailwindcss').Config} */
const baseConfig = createTailwindConfig()
export default baseConfig
