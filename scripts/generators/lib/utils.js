/**
 * Shared utilities for generator scripts
 */

const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..')
const APPS_DIR = path.join(ROOT_DIR, 'apps')
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates')
const URLS_FILE = path.join(ROOT_DIR, 'packages', 'config', 'src', 'urls.ts')
const ROOT_TSCONFIG = path.join(ROOT_DIR, 'tsconfig.json')
const ROOT_PACKAGE_JSON = path.join(ROOT_DIR, 'package.json')

/**
 * Read a template file and replace placeholders
 */
function renderTemplate(templatePath, vars) {
  let content = fs.readFileSync(path.join(TEMPLATES_DIR, templatePath), 'utf8')
  for (const [key, value] of Object.entries(vars)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return content
}

/**
 * Parse urls.ts to extract all used ports
 */
function parseExistingPorts() {
  const content = fs.readFileSync(URLS_FILE, 'utf8')
  const portMatches = content.match(/localhost:(\d+)/g) || []
  return portMatches.map(m => parseInt(m.replace('localhost:', ''), 10)).sort((a, b) => a - b)
}

/**
 * Find next available API port (ends in 0, pattern 50X0)
 */
function findNextApiPort() {
  const ports = parseExistingPorts()
  const apiPorts = ports.filter(p => p % 10 === 0).sort((a, b) => a - b)
  const last = apiPorts[apiPorts.length - 1] || 5000
  return last + 10
}

/**
 * Find next available web port (ends in 5, pattern 50X5)
 */
function findNextWebPort() {
  const ports = parseExistingPorts()
  const webPorts = ports.filter(p => p % 10 === 5).sort((a, b) => a - b)
  const last = webPorts[webPorts.length - 1] || 5005
  return last + 10
}

/**
 * Find next available port pair (api=XX0, web=XX5)
 */
function findNextPortPair() {
  const ports = parseExistingPorts()
  // Find the highest port group (in tens)
  const groups = [...new Set(ports.map(p => Math.floor(p / 10) * 10))]
  const lastGroup = Math.max(...groups, 5080)
  const nextGroup = lastGroup + 10
  return { apiPort: nextGroup, webPort: nextGroup + 5 }
}

/**
 * PascalCase from kebab-case
 */
function toPascalCase(str) {
  return str
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

/**
 * camelCase from kebab-case
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/**
 * Generate a shortcut from app name (first letters of each word, or first 2-3 chars)
 */
function generateShortcut(appName) {
  const parts = appName.split('-')
  if (parts.length >= 2) {
    return parts.map(p => p.charAt(0)).join('')
  }
  return appName.slice(0, 3)
}

/**
 * Register port in packages/config/src/urls.ts
 * Adds the app to AppName type, URLS record, and PROJECT_METADATA
 */
function registerInUrls(appName, displayName, description, apiPort, webPort, hasApi, hasWeb) {
  let content = fs.readFileSync(URLS_FILE, 'utf8')

  // 1. Add to AppName type union
  const appNameTypeRegex = /(export type AppName\s*=[\s\S]*?)('\s*\n)/
  const match = content.match(appNameTypeRegex)
  if (match) {
    // Find the last entry in AppName union and add after it
    const lastPipeRegex = /(\| '[^']+')(\s*\n\s*\n)/
    const lastPipeMatch = content.match(lastPipeRegex)
    if (lastPipeMatch) {
      content = content.replace(
        lastPipeMatch[0],
        `${lastPipeMatch[1]}\n  | '${appName}'${lastPipeMatch[2]}`
      )
    }
  }

  // 2. Add to URLS record (before the closing })
  let urlsEntry = `\n  '${appName}': {\n`
  if (hasWeb) {
    urlsEntry += `    web: {\n`
    urlsEntry += `      local: 'http://localhost:${webPort}',\n`
    urlsEntry += `      development: 'https://${appName}-web.vercel.app',\n`
    urlsEntry += `      production: 'https://${appName}.ezstart.xyz',\n`
    urlsEntry += `    },\n`
  }
  if (hasApi) {
    urlsEntry += `    api: {\n`
    urlsEntry += `      local: 'http://localhost:${apiPort}',\n`
    urlsEntry += `      production: 'https://${appName}-api.up.railway.app',\n`
    urlsEntry += `    },\n`
  }
  urlsEntry += `  },\n`

  // Insert before closing brace of URLS
  const urlsClosingRegex = /(\n\} satisfies|\n\};\s*$|\n\} as)/m
  const urlsMatch = content.match(urlsClosingRegex)
  if (urlsMatch) {
    content = content.replace(urlsMatch[0], urlsEntry + urlsMatch[0])
  } else {
    // Fallback: find the last entry in URLS and add after it
    const lastUrlEntry = content.lastIndexOf('},\n}')
    if (lastUrlEntry !== -1) {
      content = content.slice(0, lastUrlEntry + 3) + urlsEntry + content.slice(lastUrlEntry + 3)
    }
  }

  // 3. Add to PROJECT_METADATA record
  let metadataEntry = `\n  '${appName}': {\n`
  metadataEntry += `    name: '${displayName}',\n`
  metadataEntry += `    description: '${description}',\n`
  metadataEntry += `    emoji: '📦',\n`
  metadataEntry += `    githubPath: 'apps/${appName}',\n`
  if (hasWeb) metadataEntry += `    webPlatform: 'vercel',\n`
  if (hasApi) metadataEntry += `    apiPlatform: 'railway',\n`
  metadataEntry += `  },\n`

  // Find closing of PROJECT_METADATA
  // Look for the pattern: last entry of PROJECT_METADATA before its closing }
  const metadataBlockRegex = /export const PROJECT_METADATA[\s\S]*?\n\}\s*\n/
  const metadataBlock = content.match(metadataBlockRegex)
  if (metadataBlock) {
    const block = metadataBlock[0]
    const lastBrace = block.lastIndexOf('}')
    const secondLastBrace = block.lastIndexOf('}', lastBrace - 1)
    // Insert before the final closing brace of the record
    const insertPos = metadataBlock.index + lastBrace
    content = content.slice(0, insertPos) + metadataEntry + content.slice(insertPos)
  }

  fs.writeFileSync(URLS_FILE, content)
  console.log(`  Registered ports in packages/config/src/urls.ts`)
}

/**
 * Add references to root tsconfig.json
 */
function addTsconfigReferences(appName, hasApi, hasWeb, hasTypes) {
  let content = fs.readFileSync(ROOT_TSCONFIG, 'utf8')

  const refs = []
  if (hasTypes) refs.push(`    { "path": "./apps/${appName}/types" }`)
  if (hasApi) refs.push(`    { "path": "./apps/${appName}/api" }`)
  if (hasWeb) refs.push(`    { "path": "./apps/${appName}/web" }`)

  // Insert before the closing ] of references array
  const closingBracket = content.lastIndexOf(']')
  if (closingBracket !== -1) {
    // Check if there's already a trailing comma or we need to add one
    const beforeBracket = content.slice(0, closingBracket).trimEnd()
    const needsComma = !beforeBracket.endsWith(',')
    const insertion = (needsComma ? ',' : '') + '\n\n    // ' + appName + '\n' + refs.join(',\n')
    content = beforeBracket + insertion + '\n  ' + content.slice(closingBracket)
  }

  fs.writeFileSync(ROOT_TSCONFIG, content)
  console.log(`  Added references to root tsconfig.json`)
}

/**
 * Add dev script to root package.json
 */
function addDevScript(appName, shortcut, dependsOn, hasApi, hasWeb) {
  const pkg = JSON.parse(fs.readFileSync(ROOT_PACKAGE_JSON, 'utf8'))

  const scriptKey = `dev:${shortcut}`
  if (pkg.scripts[scriptKey]) {
    console.log(`  Script "${scriptKey}" already exists, skipping`)
    return
  }

  // Build turbo filter command
  const filters = []

  // Clear .next cache
  const rimrafParts = []
  if (hasWeb) rimrafParts.push(`apps/${appName}/web/.next`)

  // Add dependency filters (e.g., ezauth)
  if (dependsOn && dependsOn.length > 0) {
    for (const dep of dependsOn) {
      if (hasWeb) rimrafParts.push(`apps/${dep}/web/.next`)
      filters.push(`--filter=web-${dep}...`)
      filters.push(`--filter=api-${dep}...`)
    }
  }

  // Add own filters
  if (hasWeb) filters.push(`--filter=web-${appName}...`)
  if (hasApi) filters.push(`--filter=api-${appName}...`)

  const rimrafCmd = rimrafParts.length > 0 ? `rimraf ${rimrafParts.join(' ')} && ` : ''
  const concurrency = filters.length > 2 ? ' --concurrency=15' : ''
  const script = `${rimrafCmd}turbo run dev ${filters.join(' ')}${concurrency}`

  pkg.scripts[scriptKey] = script
  fs.writeFileSync(ROOT_PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`  Added script "pnpm ${scriptKey}" to root package.json`)
}

/**
 * Check if app already exists
 */
function appExists(appName) {
  return fs.existsSync(path.join(APPS_DIR, appName))
}

/**
 * Create directory recursively
 */
function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

/**
 * Write file, creating parent dirs if needed
 */
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

module.exports = {
  ROOT_DIR,
  APPS_DIR,
  TEMPLATES_DIR,
  URLS_FILE,
  ROOT_TSCONFIG,
  ROOT_PACKAGE_JSON,
  renderTemplate,
  parseExistingPorts,
  findNextApiPort,
  findNextWebPort,
  findNextPortPair,
  toPascalCase,
  toCamelCase,
  generateShortcut,
  registerInUrls,
  addTsconfigReferences,
  addDevScript,
  appExists,
  mkdirp,
  writeFile,
}
