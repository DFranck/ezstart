#!/usr/bin/env node
/**
 * Colorize turbo dev output by package type.
 * API logs (api-*) -> red/orange
 * Web logs (web-*) -> blue/cyan
 * Package logs (@ezstart/*) -> dim/gray
 *
 * Usage: node scripts/tools/colorize-turbo.js <turbo args...>
 * Example: node scripts/tools/colorize-turbo.js run dev --filter=web-game-analyzer...
 */

const { spawn } = require('child_process')

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  orange: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

function colorize(line) {
  // API logs: api-xxx:dev:
  if (/^api-[^:]+:dev:/.test(line)) {
    return `${COLORS.orange}${line}${COLORS.reset}`
  }
  // Web logs: web-xxx:dev:
  if (/^web-[^:]+:dev:/.test(line)) {
    return `${COLORS.cyan}${line}${COLORS.reset}`
  }
  // Package logs: @ezstart/xxx:dev: or @game-analyzer/xxx:dev:
  if (/^@[^:]+:dev:/.test(line)) {
    return `${COLORS.dim}${line}${COLORS.reset}`
  }
  // Turbo meta lines
  if (line.startsWith('\u2022') || line.startsWith('>') || line.trim() === '') {
    return `${COLORS.dim}${line}${COLORS.reset}`
  }
  return line
}

const args = process.argv.slice(2)
const turboPath = process.platform === 'win32' ? 'turbo.cmd' : 'turbo'

const child = spawn(turboPath, args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' },
})

let stdoutBuffer = ''
child.stdout.on('data', (data) => {
  stdoutBuffer += data.toString()
  const lines = stdoutBuffer.split('\n')
  stdoutBuffer = lines.pop() // Keep incomplete line in buffer
  lines.forEach(line => {
    process.stdout.write(colorize(line) + '\n')
  })
})

let stderrBuffer = ''
child.stderr.on('data', (data) => {
  stderrBuffer += data.toString()
  const lines = stderrBuffer.split('\n')
  stderrBuffer = lines.pop()
  lines.forEach(line => {
    process.stderr.write(colorize(line) + '\n')
  })
})

child.on('close', (code) => {
  if (stdoutBuffer) process.stdout.write(colorize(stdoutBuffer) + '\n')
  if (stderrBuffer) process.stderr.write(colorize(stderrBuffer) + '\n')
  process.exit(code || 0)
})

// Forward signals
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
