/**
 * Enhanced SEO Configurations for All Apps
 *
 * Complete, detailed SEO data extracted from docs/seo/ documentation.
 * Used by metadata generators and landing page components.
 */

export * from './ezstart'
export * from './ezauth'
export * from './ezpay'
export * from './ezbill'
export * from './tower-defense'
export * from './green-pulse'
export * from './fengshui'
export * from './asc-tcd'

import { ezstartSEO } from './ezstart'
import { ezauthSEO } from './ezauth'
import { ezpaySEO } from './ezpay'
import { ezbillSEO } from './ezbill'
import { towerDefenseSEO } from './tower-defense'
import { greenPulseSEO } from './green-pulse'
import { fengshuiSEO } from './fengshui'
import { ascTcdSEO } from './asc-tcd'

export const appSEOConfigs = {
  ezstart: ezstartSEO,
  ezauth: ezauthSEO,
  ezpay: ezpaySEO,
  ezbill: ezbillSEO,
  'tower-defense': towerDefenseSEO,
  'green-pulse': greenPulseSEO,
  fengshui: fengshuiSEO,
  'asc-tcd': ascTcdSEO,
} as const

export type AppSEOKey = keyof typeof appSEOConfigs

/**
 * Get enhanced SEO config for an app
 *
 * @example
 * ```ts
 * import { getAppSEO } from '@ezstart/seo-config/apps'
 *
 * const seoData = getAppSEO('ezstart')
 * console.log(seoData.features) // Full feature descriptions
 * console.log(seoData.keywords.primary) // Primary keywords with volume
 * console.log(seoData.useCases) // Detailed use cases
 * ```
 */
export function getAppSEO(appKey: AppSEOKey) {
  return appSEOConfigs[appKey]
}

/**
 * Get all app SEO configs as array
 */
export function getAllAppSEO() {
  return Object.values(appSEOConfigs)
}

/**
 * Get SEO config by app name (case-insensitive)
 */
export function getAppSEOByName(appName: string) {
  const key = Object.keys(appSEOConfigs).find(
    k => k.toLowerCase() === appName.toLowerCase()
  ) as AppSEOKey | undefined

  return key ? appSEOConfigs[key] : null
}
