/**
 * Railway project + service mapping per app.
 *
 * Different apps in the @ezstart monorepo live in different Railway projects:
 *   - ezstart-apis project   → ezauth-api, ezpay-api, ezstart-api, ezbill-api,
 *                              gacha-analyzer-api
 *   - TeamProjects project   → green-pulse-api
 *
 * Without this map, `pnpm env:push:railway <app>` would have to rely on whatever
 * project is currently `railway link`ed locally, and pushing to an app in a
 * different project would fail with "Service not found".
 *
 * With this map, `push-railway.ts` calls `railway link -p <project> -s <service>
 * -e <env>` before each push, transparently switching to the correct project.
 *
 * Adding a new app = 1 line in the map below.
 *
 * Apps that have no API layer (asc-tcd, fengshui) are intentionally absent.
 * Trying to push them via env:push:railway will fail loudly with a clear
 * "no Railway project mapping" error.
 */

export interface RailwayAppConfig {
  /** Railway project name (as shown in `railway list`). */
  project: string
  /** Railway service name within the project (e.g. 'ezauth-api'). */
  serviceName: string
  /** Optional Railway workspace (only required when multiple workspaces exist). */
  workspace?: string
}

export const RAILWAY_APP_PROJECTS: Record<string, RailwayAppConfig> = {
  ezauth: { project: 'ezstart-apis', serviceName: 'ezauth-api' },
  ezpay: { project: 'ezstart-apis', serviceName: 'ezpay-api' },
  ezstart: { project: 'ezstart-apis', serviceName: 'ezstart-api' },
  ezbill: { project: 'ezstart-apis', serviceName: 'ezbill-api' },
  'gacha-analyzer': { project: 'ezstart-apis', serviceName: 'gacha-analyzer-api' },
  'green-pulse': { project: 'TeamProjects', serviceName: 'green-pulse-api' },
  // asc-tcd: no API layer (web-only)
  // fengshui: no API layer (web-only)
}

export function getRailwayAppConfig(app: string): RailwayAppConfig | null {
  return RAILWAY_APP_PROJECTS[app] ?? null
}
