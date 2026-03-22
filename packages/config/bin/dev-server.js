#!/usr/bin/env node
/**
 * Universal dev server launcher for Next.js apps
 * Auto-detects app name from package.json and uses correct port from @ezstart/config
 *
 * Usage in web app package.json:
 * "dev": "node ../../../packages/config/bin/dev-server.js"
 */

import { spawn } from 'child_process'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import net from 'net'
import { getPort } from '../dist/urls.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Auto-detect app name from package.json
const pkgPath = join(process.cwd(), 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const pkgName = pkg.name

// Map package names to config app names
const appNameMap = {
  'web-ezstart': 'ezstart',
  'web-ezauth': 'ezauth',
  'web-ezbill': 'ezbill',
  'web-ezpay': 'ezpay',
  'web-fengshui': 'fengshui',
  'web-tower-defense': 'tower-defense',
  'web-asc-tcd': 'asc-tcd',
  'web-green-pulse': 'green-pulse',
  'web-game-analyzer': 'game-analyzer',
}

const appName = appNameMap[pkgName]

if (!appName) {
  console.error(`❌ Unknown app name: ${pkgName}`)
  console.error(`   Add mapping in packages/config/bin/dev-server.js`)
  process.exit(1)
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(port, () => {
      server.once('close', () => resolve(true))
      server.close()
    })
    server.on('error', () => resolve(false))
  })
}

async function findFreePort(startPort) {
  let port = startPort
  while (!(await isPortFree(port))) {
    console.log(`⚠️  Port ${port} is in use, trying ${port + 1}...`)
    port++
  }
  return port
}

async function startDev() {
  try {
    // Get port from @ezstart/config (single source of truth)
    const configPort = getPort(appName, 'web')
    const preferredPort = process.env.PORT ? parseInt(process.env.PORT) : configPort
    const port = await findFreePort(preferredPort)

    if (port !== configPort) {
      console.log(`⚠️  Using port ${port} instead of configured port ${configPort}`)
    }

    console.log(`🚀 Starting ${appName} dev server on port ${port}`)

    const child = spawn('next', ['dev', '--turbopack', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true,
    })

    child.on('error', (error) => {
      console.error('❌ Error starting dev server:', error)
      process.exit(1)
    })

    child.on('exit', (code) => {
      process.exit(code || 0)
    })
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

startDev()
