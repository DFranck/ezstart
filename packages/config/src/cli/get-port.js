#!/usr/bin/env node
/**
 * CLI tool to get port for an app from @ezstart/config
 * Usage: node packages/config/dist/cli/get-port.js <app-name> [web|api]
 */

import { getPort } from '../urls.js'

const appName = process.argv[2]
const type = process.argv[3] || 'web'

if (!appName) {
  console.error('Usage: get-port <app-name> [web|api]')
  process.exit(1)
}

try {
  const port = getPort(appName, type)
  console.log(port)
} catch (error) {
  console.error(`Error: ${error.message}`)
  process.exit(1)
}
