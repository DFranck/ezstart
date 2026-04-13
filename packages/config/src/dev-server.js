#!/usr/bin/env node
/**
 * Universal dev server launcher for all web apps
 * Automatically uses correct port from @ezstart/config
 *
 * Usage in package.json:
 * "dev": "node ../../packages/config/src/dev-server.js ezstart"
 */

import { spawn } from 'child_process'
import net from 'net'
import { getPort } from './urls.js'

const appName = process.argv[2]

if (!appName) {
  console.error('❌ Error: App name required')
  console.error('Usage: node dev-server.js <app-name>')
  console.error('Example: node dev-server.js ezstart')
  process.exit(1)
}

async function isPortFree(port) {
  return new Promise(resolve => {
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

    const child = spawn('next', ['dev', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true,
    })

    child.on('error', error => {
      console.error('❌ Error starting dev server:', error)
      process.exit(1)
    })

    child.on('exit', code => {
      process.exit(code || 0)
    })
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

startDev()
