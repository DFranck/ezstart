#!/usr/bin/env node
/**
 * Generate a cryptographically secure secret for JWT, API keys, etc.
 *
 * Usage:
 *   node scripts/tools/generate-secret.js          # 64 bytes base64url
 *   node scripts/tools/generate-secret.js 32       # 32 bytes base64url
 *   node scripts/tools/generate-secret.js --hex     # 64 bytes hex
 */

const crypto = require('crypto')

const args = process.argv.slice(2)
const isHex = args.includes('--hex')
const bytes = parseInt(args.find(a => /^\d+$/.test(a)) || '64', 10)

const secret = isHex
  ? crypto.randomBytes(bytes).toString('hex')
  : crypto.randomBytes(bytes).toString('base64url')

console.log(secret)
console.log(`\n# ${bytes} bytes, ${isHex ? 'hex' : 'base64url'} encoded`)
console.log('# Copy this into your .env.local:')
console.log(`# JWT_SECRET=${secret}`)
