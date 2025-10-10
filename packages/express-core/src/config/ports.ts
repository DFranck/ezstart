/**
 * Get the port for an API service from environment variables
 * Pattern: 50x0 = APIs | 50x5 = Web Apps
 * Each service should define its PORT in .env file for development
 *
 * Development ports (defined in .env files):
 * EZAuth API: 5010, EZAuth Web: 5015
 * EZBill API: 5020, EZBill Web: 5025
 * Tower Defense API: 5030, Tower Defense Web: 5035
 * EZPay API: 5040, EZPay Web: 5045
 * EZStart Web: 5050, ASC-TCD Web: 5055, FengShui Web: 5065
 * Green Pulse API: 5070, Green Pulse Web: 5075
 */
export function getApiPort(defaultPort = 3000): number {
  const port = process.env.PORT
  if (!port) {
    console.warn(`⚠️ PORT not defined, using fallback: ${defaultPort}`)
    return defaultPort
  }
  return parseInt(port, 10)
}
