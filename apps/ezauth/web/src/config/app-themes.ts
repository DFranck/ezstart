import type { KnownIconName } from '@ezstart/ui/components'

export interface AppTheme {
  /** App display name */
  name: string
  /** App description/tagline */
  tagline: string
  /** Logo path (relative to public folder) */
  logo?: string
  /** Logo for dark mode (if different) */
  logoDark?: string
  /**
   * Primary text color class — uses CSS var `--primary` which is overridden
   * per-app via `data-app="xxx"` on the wrapper. So `text-primary` resolves
   * to the app's brand color automatically.
   */
  primaryColor: string
  /** Background accent color class — same mechanism as primaryColor */
  bgAccent: string
  /** Icon name for the app */
  icon?: KnownIconName
  /** Whether to show "One account, all EZStart apps!" message */
  showEzstartMessage?: boolean
}

const BASE_THEME: Pick<AppTheme, 'primaryColor' | 'bgAccent'> = {
  primaryColor: 'text-primary',
  bgAccent: 'bg-primary/10',
}

export const defaultTheme: AppTheme = {
  ...BASE_THEME,
  name: 'EZStart',
  tagline: 'Your digital ecosystem',
  logo: '/logos/ezstart.svg',
  icon: 'lucide:Rocket',
  showEzstartMessage: true,
}

export const appThemes: Record<string, AppTheme> = {
  ezstart: {
    ...BASE_THEME,
    name: 'EZStart',
    tagline: 'Your digital ecosystem',
    logo: '/logos/ezstart.svg',
    icon: 'lucide:Rocket',
    showEzstartMessage: true,
  },
  'green-pulse': {
    ...BASE_THEME,
    name: 'GreenPulse.AI',
    tagline: 'Your AI Sustainability Assistant',
    logo: '/logos/greenpulse-light.svg',
    logoDark: '/logos/greenpulse-dark.svg',
    icon: 'lucide:Leaf',
    showEzstartMessage: false,
  },
  ezbill: {
    ...BASE_THEME,
    name: 'EZBill',
    tagline: 'Professional Invoicing Made Easy',
    logo: '/logos/ezbill.svg',
    icon: 'lucide:FileText',
    showEzstartMessage: true,
  },
  ezpay: {
    ...BASE_THEME,
    name: 'EZPay',
    tagline: 'Secure Payment Solutions',
    logo: '/logos/ezpay.svg',
    icon: 'lucide:CreditCard',
    showEzstartMessage: true,
  },
  fengshui: {
    ...BASE_THEME,
    name: 'FengShui',
    tagline: 'AI-Powered Feng Shui Analysis',
    logo: '/logos/fengshui.svg',
    icon: 'lucide:Compass',
    showEzstartMessage: true,
  },
}

/**
 * Get theme for an app, fallback to default theme
 */
export function getAppTheme(app: string | null | undefined): AppTheme {
  if (!app) return defaultTheme
  return appThemes[app.toLowerCase()] || defaultTheme
}
