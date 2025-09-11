/**
 * Centralized port configuration for all APIs in the monorepo
 * Each API should use its designated port for consistency
 */
export const API_PORTS = {
  EZAUTH: 8081,
  EZ_BILLING: 4101,
  TOWER_DEFENSE: 4201,
} as const

/**
 * Get the port for a specific API service
 * Falls back to process.env.PORT if defined, otherwise uses the default
 */
export function getApiPort(service: keyof typeof API_PORTS): number {
  const envPort = process.env.PORT
  if (envPort) {
    return parseInt(envPort, 10)
  }
  return API_PORTS[service]
}
