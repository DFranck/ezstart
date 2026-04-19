export interface AppTheme {
  /** App display name */
  name: string
  /**
   * Primary text color class — uses CSS var `--primary` which is overridden
   * per-app via `data-app="xxx"` on the wrapper. So `text-primary` resolves
   * to the app's brand color automatically.
   */
  primaryColor: string
  /** Whether to show "One account, all EZStart apps!" message */
  showEzstartMessage?: boolean
}

const BASE_THEME: Pick<AppTheme, 'primaryColor'> = {
  primaryColor: 'text-primary',
}

export const defaultTheme: AppTheme = {
  ...BASE_THEME,
  name: 'EZStart',
  showEzstartMessage: true,
}

export const appThemes: Record<string, AppTheme> = {
  ezauth: {
    ...BASE_THEME,
    name: 'EZAuth',
    showEzstartMessage: true,
  },
  ezstart: {
    ...BASE_THEME,
    name: 'EZStart',
    showEzstartMessage: true,
  },
  'green-pulse': {
    ...BASE_THEME,
    name: 'GreenPulse.AI',
    showEzstartMessage: false,
  },
  ezbill: {
    ...BASE_THEME,
    name: 'EZBill',
    showEzstartMessage: true,
  },
  ezpay: {
    ...BASE_THEME,
    name: 'EZPay',
    showEzstartMessage: true,
  },
  fengshui: {
    ...BASE_THEME,
    name: 'FengShui',
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
