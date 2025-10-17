/**
 * Project-based health checker
 * Groups health checks by project instead of individual services
 */

import type { ProjectHealth, ProjectId, ProjectEndpoint } from '../types/project'
import type { HealthStatus } from '../types/health'
import { HealthChecker } from './health-checker'
import { PROJECT_ENDPOINTS } from '../utils/project-config'

export class ProjectHealthChecker {
  private healthChecker: HealthChecker

  constructor() {
    this.healthChecker = new HealthChecker()
  }

  /**
   * Check all endpoints for a specific project
   */
  async checkProject(
    projectId: ProjectId,
    environment: 'local' | 'production' = 'local',
    options?: { timeout?: number; retries?: number }
  ): Promise<ProjectHealth> {
    const config = PROJECT_ENDPOINTS[projectId]

    // Check all endpoints for this project
    const endpointResults = await Promise.all(
      config.endpoints.map(async endpoint => {
        const url = endpoint.getUrl(environment)

        try {
          const result = await this.healthChecker.check({
            name: `${config.name} - ${endpoint.label}`,
            type: endpoint.type === 'web' ? 'web' : 'api',
            url,
            timeout: options?.timeout || 5000,
            interval: 30000,
            retries: options?.retries || 3,
          })

          const projectEndpoint: ProjectEndpoint = {
            type: endpoint.type,
            label: endpoint.label,
            url,
            platform: endpoint.platform,
            status: result.status,
            responseTime: result.responseTime,
            error: result.error,
            lastCheck: result.timestamp,
            // Add API metadata if available
            metadata: endpoint.endpointsCount || endpoint.getSwaggerUrl
              ? {
                  endpointsCount: endpoint.endpointsCount,
                  swaggerUrl: endpoint.getSwaggerUrl?.(environment),
                }
              : undefined,
          }

          return projectEndpoint
        } catch (error) {
          const projectEndpoint: ProjectEndpoint = {
            type: endpoint.type,
            label: endpoint.label,
            url,
            platform: endpoint.platform,
            status: 'unhealthy' as HealthStatus,
            responseTime: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            lastCheck: new Date(),
            // Add API metadata even on error
            metadata: endpoint.endpointsCount || endpoint.getSwaggerUrl
              ? {
                  endpointsCount: endpoint.endpointsCount,
                  swaggerUrl: endpoint.getSwaggerUrl?.(environment),
                }
              : undefined,
          }

          return projectEndpoint
        }
      })
    )

    // Calculate overall health
    const healthyCount = endpointResults.filter(e => e.status === 'healthy').length
    const totalCount = endpointResults.length

    let overallStatus: HealthStatus = 'healthy'
    if (healthyCount === 0) {
      overallStatus = 'unhealthy'
    } else if (healthyCount < totalCount) {
      overallStatus = 'degraded'
    }

    // Calculate average response time
    const validResponses = endpointResults.filter(e => e.responseTime !== null)
    const avgResponseTime =
      validResponses.length > 0
        ? Math.round(
            validResponses.reduce((acc, e) => acc + (e.responseTime || 0), 0) / validResponses.length
          )
        : null

    const projectHealth: ProjectHealth = {
      id: projectId,
      name: config.name,
      description: config.description,
      emoji: config.emoji,
      logo: config.logo, // Optional logo, fallback to emoji if not provided
      githubUrl: config.githubUrl, // GitHub repository URL
      endpoints: endpointResults,
      overallStatus,
      healthyCount,
      totalCount,
      avgResponseTime,
      lastCheck: new Date(),
    }

    return projectHealth
  }

  /**
   * Check all projects
   */
  async checkAllProjects(
    environment: 'local' | 'production' = 'local',
    options?: { timeout?: number; retries?: number }
  ): Promise<ProjectHealth[]> {
    const projectIds = Object.keys(PROJECT_ENDPOINTS) as ProjectId[]

    const results = await Promise.all(
      projectIds.map(id => this.checkProject(id, environment, options))
    )

    return results
  }
}
