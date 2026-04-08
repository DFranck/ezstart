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
  /** Primary text color class */
  primaryColor: string
  /** Background accent color class */
  bgAccent: string
  /** Brand color (OKLCH value) — overrides --brand CSS variable for buttons */
  brandColor?: string
  /** Brand foreground color (OKLCH value) — overrides --brand-foreground */
  brandForeground?: string
  /** Icon name for the app */
  icon?: KnownIconName
  /** Whether to show "One account, all EZStart apps!" message */
  showEzstartMessage?: boolean
}

export const defaultTheme: AppTheme = {
  name: 'EZStart',
  tagline: 'Your digital ecosystem',
  logo: '/logos/ezstart.svg',
  primaryColor: 'text-primary',
  bgAccent: 'bg-primary/10',
  icon: 'lucide:Rocket',
  showEzstartMessage: true,
}

export const appThemes: Record<string, AppTheme> = {
  ezstart: {
    name: 'EZStart',
    tagline: 'Your digital ecosystem',
    logo: '/logos/ezstart.svg',
    primaryColor: 'text-primary',
    bgAccent: 'bg-primary/10',
    icon: 'lucide:Rocket',
    showEzstartMessage: true,
  },
  'green-pulse': {
    name: 'GreenPulse.AI',
    tagline: 'Your AI Sustainability Assistant',
    logo: '/logos/greenpulse-light.svg',
    logoDark: '/logos/greenpulse-dark.svg',
    primaryColor: 'text-gp-primary',
    bgAccent: 'bg-gp-primary/10',
    brandColor: 'oklch(0.6 0.18 145)',
    brandForeground: 'oklch(0.98 0.01 145)',
    icon: 'lucide:Leaf',
    showEzstartMessage: false,
  },
  ezbill: {
    name: 'EZBill',
    tagline: 'Professional Invoicing Made Easy',
    logo: '/logos/ezbill.svg',
    primaryColor: 'text-ezbill',
    bgAccent: 'bg-ezbill/10',
    icon: 'lucide:FileText',
    showEzstartMessage: true,
  },
  ezpay: {
    name: 'EZPay',
    tagline: 'Secure Payment Solutions',
    logo: '/logos/ezpay.svg',
    primaryColor: 'text-ezpay',
    bgAccent: 'bg-ezpay/10',
    icon: 'lucide:CreditCard',
    showEzstartMessage: true,
  },
  fengshui: {
    name: 'FengShui',
    tagline: 'AI-Powered Feng Shui Analysis',
    logo: '/logos/fengshui.svg',
    primaryColor: 'text-fengshui',
    bgAccent: 'bg-fengshui/10',
    brandColor: 'oklch(0.78 0.16 80)',
    brandForeground: 'oklch(0.15 0.05 80)',
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
