/**
 * Configuration centralisée des domaines de production pour toutes les apps
 */
export const DOMAINS = {
  ezstart: 'https://ezstart-web.vercel.app',
  ezauth: 'https://ezauth.vercel.app',
  ezbill: 'https://ezbill-web.vercel.app',
  ezpay: 'https://ezpay.vercel.app',
  fengshui: 'https://fengshui-web.vercel.app',
  'tower-defense': 'https://tower-defense-web.vercel.app',
  'asc-tcd': 'https://asc-tcd-web.vercel.app',
  'green-pulse': 'https://green-pulse-web.vercel.app',
} as const

export type AppName = keyof typeof DOMAINS

export function getDomain(appName: AppName): string {
  return DOMAINS[appName]
}
