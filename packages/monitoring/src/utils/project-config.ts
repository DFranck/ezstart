/**
 * Dynamic project configuration generator
 * Automatically generates PROJECT_ENDPOINTS from @ezstart/config
 */

import type { AppName } from '@ezstart/config'
import {
  getAllApps,
  getProjectMetadata,
  hasApi,
  getApiUrl,
  getWebUrl,
  getGitHubUrl,
  getLogoUrl,
} from '@ezstart/config'
import type { ProjectId, ProjectConfig } from '../types/project'

/**
 * Manual endpoint counts for APIs
 * TODO: Could be auto-detected by parsing route files
 */
const API_ENDPOINTS_COUNT: Partial<Record<AppName, number>> = {
  ezauth: 8,
  ezbill: 49,
  ezpay: 6,
  'tower-defense': 7,
  'green-pulse': 2,
}

/**
 * Generate endpoints configuration for an app
 */
function generateEndpoints(app: AppName): ProjectConfig['endpoints'] {
  const metadata = getProjectMetadata(app)
  const endpoints: ProjectConfig['endpoints'] = []

  // Add API endpoint if app has one
  if (hasApi(app)) {
    endpoints.push({
      type: 'api',
      label: 'API',
      getUrl: env => {
        const apiUrl = getApiUrl(app, env)
        return `${apiUrl}/api/health`
      },
      platform: metadata.apiPlatform,
      endpointsCount: API_ENDPOINTS_COUNT[app],
      getSwaggerUrl: env => {
        const apiUrl = getApiUrl(app, env)
        return `${apiUrl}/docs`
      },
    })
  }

  // Add Web endpoint
  endpoints.push({
    type: 'web',
    label: 'Web',
    getUrl: env => getWebUrl(app, env),
    platform: metadata.webPlatform,
  })

  return endpoints
}

/**
 * Generate complete project configuration from @ezstart/config
 * Excludes 'monitoring' to avoid meta-monitoring
 */
export function generateProjectConfig(): Record<ProjectId, ProjectConfig> {
  const allApps = getAllApps()
  const config: Partial<Record<ProjectId, ProjectConfig>> = {}

  for (const app of allApps) {
    // Skip monitoring (no meta-monitoring)
    if (app === 'monitoring') continue

    const metadata = getProjectMetadata(app)
    const logoUrl = getLogoUrl(app)

    config[app as ProjectId] = {
      name: metadata.name,
      emoji: metadata.emoji,
      logo: logoUrl,
      description: metadata.description,
      githubUrl: getGitHubUrl(app),
      endpoints: generateEndpoints(app),
    }
  }

  return config as Record<ProjectId, ProjectConfig>
}

/**
 * Get dynamically generated PROJECT_ENDPOINTS
 * This replaces the hardcoded configuration
 */
export const PROJECT_ENDPOINTS = generateProjectConfig()
