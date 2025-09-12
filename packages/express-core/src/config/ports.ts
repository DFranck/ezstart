/**
 * Get the port for an API service from environment variables
 * Pattern: 50x0 = APIs | 50x5 = Web Apps
 * Each service should define its PORT in .env file for development
 * 
 * Development ports (defined in .env files):
 * EZAuth API: 5010, EZ-Billing API: 5020, Tower Defense API: 5030
 * EZAuth Web: 5015, EZ-Billing Web: 5025, Tower Defense Web: 5035
 * EZStart Web: 5045, ASC-TCD Web: 5055, FengShui Web: 5065
 */
export function getApiPort(defaultPort = 3000): number {
  const port = process.env.PORT
  if (!port) {
    console.warn(`⚠️ PORT not defined, using fallback: ${defaultPort}`)
    return defaultPort
  }
  return parseInt(port, 10)
}
