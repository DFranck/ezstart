#!/usr/bin/env node

/**
 * Script to get all @ezstart ports from @ezstart/config
 * Outputs ports as JSON array for use in kill-ports.ps1
 */

import { URLS } from '../packages/config/dist/urls.js'

const ports = new Set()

// Extract all local ports from URLS config
for (const [appName, urls] of Object.entries(URLS)) {
  // Web port
  if (urls.web?.local) {
    const webPort = new URL(urls.web.local).port
    if (webPort) ports.add(parseInt(webPort))
  }

  // API port
  if (urls.api?.local) {
    const apiPort = new URL(urls.api.local).port
    if (apiPort) ports.add(parseInt(apiPort))
  }
}

// Output as JSON array
console.log(JSON.stringify(Array.from(ports).sort((a, b) => a - b)))
