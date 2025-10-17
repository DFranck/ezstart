/**
 * Types for deployment monitoring
 */

export type DeploymentPlatform = 'railway' | 'vercel' | 'local'

export type DeploymentStatus = 'active' | 'deploying' | 'failed' | 'inactive'

export interface DeploymentConfig {
  name: string
  platform: DeploymentPlatform
  url: string
  repositoryPath: string // relative to monorepo root
  envVarsCount: number
  healthCheckUrl?: string
}

export interface DeploymentInfo {
  name: string
  platform: DeploymentPlatform
  status: DeploymentStatus
  url: string
  lastDeployedAt: Date | null
  lastDeployedBy: string | null
  commitHash: string | null
  commitMessage: string | null
  buildTime: number | null // seconds
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
}

export interface InfrastructureCost {
  platform: DeploymentPlatform
  service: string
  monthlyCost: number // USD
  usage: {
    cpu?: number // percentage
    memory?: number // MB
    bandwidth?: number // GB
  }
  limit: {
    cpu?: number
    memory?: number
    bandwidth?: number
  }
}

// Deployment configurations from CLAUDE.md and DEPLOY.md
export const DEPLOYMENT_CONFIGS: Record<string, DeploymentConfig> = {
  'ezauth-api': {
    name: 'EZAuth API',
    platform: 'railway',
    url: 'https://ezauth-api.up.railway.app',
    repositoryPath: 'apps/ezauth/api',
    envVarsCount: 5,
    healthCheckUrl: '/api/health',
  },
  'ezpay-api': {
    name: 'EZPay API',
    platform: 'railway',
    url: 'https://ezpay-api.up.railway.app',
    repositoryPath: 'apps/ezpay/api',
    envVarsCount: 6,
    healthCheckUrl: '/api/health',
  },
  'ezbill-api': {
    name: 'EZBill API',
    platform: 'railway',
    url: 'https://ezbill-api.up.railway.app',
    repositoryPath: 'apps/ezbill/api',
    envVarsCount: 4,
    healthCheckUrl: '/api/health',
  },
  'tower-defense-api': {
    name: 'Tower Defense API',
    platform: 'railway',
    url: 'https://tower-defense-api.up.railway.app',
    repositoryPath: 'apps/tower-defense/api',
    envVarsCount: 4,
    healthCheckUrl: '/api/health',
  },
  'green-pulse-api': {
    name: 'GreenPulse API',
    platform: 'railway',
    url: 'https://green-pulse-api.up.railway.app',
    repositoryPath: 'apps/green-pulse/api',
    envVarsCount: 4,
    healthCheckUrl: '/api/health',
  },

  'ezstart-web': {
    name: 'EZStart',
    platform: 'vercel',
    url: 'https://www.ezstart.xyz',
    repositoryPath: 'apps/ezstart/web',
    envVarsCount: 3,
  },
  'ezauth-web': {
    name: 'EZAuth',
    platform: 'vercel',
    url: 'https://ezauth.ezstart.xyz',
    repositoryPath: 'apps/ezauth/web',
    envVarsCount: 2,
  },
  'ezbill-web': {
    name: 'EZBill',
    platform: 'vercel',
    url: 'https://ezbill.ezstart.xyz',
    repositoryPath: 'apps/ezbill/web',
    envVarsCount: 2,
  },
  'ezpay-web': {
    name: 'EZPay',
    platform: 'vercel',
    url: 'https://ezpay.ezstart.xyz',
    repositoryPath: 'apps/ezpay/web',
    envVarsCount: 3,
  },
  'tower-defense-web': {
    name: 'Tower Defense',
    platform: 'vercel',
    url: 'https://tower-defense.ezstart.xyz',
    repositoryPath: 'apps/tower-defense/web',
    envVarsCount: 2,
  },
  'fengshui-web': {
    name: 'FengShui',
    platform: 'vercel',
    url: 'https://ezfengshui.ezstart.xyz',
    repositoryPath: 'apps/fengshui/web',
    envVarsCount: 1,
  },
  'asc-tcd-web': {
    name: 'ASC-TCD',
    platform: 'vercel',
    url: 'https://www.asc-tcd.com',
    repositoryPath: 'apps/asc-tcd/web',
    envVarsCount: 1,
  },
  'green-pulse-web': {
    name: 'GreenPulse',
    platform: 'vercel',
    url: 'https://www.ai-greenpulse.com',
    repositoryPath: 'apps/green-pulse/web',
    envVarsCount: 2,
  },
}
