/**
 * Shared helpers to fetch secrets from Vercel + Railway and to write them
 * to a .env-style file.
 *
 * Used by:
 *   - secrets-sync.js   (push root .env.production → platforms)
 *   - secrets-pull.js   (pull platforms → root .env.production)
 *   - secrets-audit.js  (compare local vs cloud)
 *
 * All helpers mask sensitive values in their own logs — callers should also
 * never print raw values.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ── Targets (kept in sync with secrets-sync.js) ──────────────────────────
const RAILWAY_SERVICES = [
  { service: 'ezauth-api', project: 'ezstart-apis' },
  { service: 'ezbill-api', project: 'ezstart-apis' },
  { service: 'ezpay-api', project: 'ezstart-apis' },
  { service: 'gacha-analyzer-api', project: 'ezstart-apis' },
  { service: 'greenpulse-api', project: 'TeamProjects' },
  { service: 'ezstart-api', project: 'ezstart-apis' },
]

const VERCEL_PROJECTS = [
  'web-ezstart',
  'web-ezauth',
  'web-ezbill',
  'web-ezpay',
  'web-green-pulse',
  'web-fengshui',
  'web-asc-tcd',
  'web-gacha-analyzer',
]

// ── Masking ──────────────────────────────────────────────────────────────
const SENSITIVE_RE = /(SECRET|KEY|TOKEN|PASSWORD|DSN|PRIVATE)/i

function mask(value) {
  if (value === undefined || value === null) return '(undefined)'
  if (value === '') return '(empty)'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

function display(key, value) {
  if (value === undefined || value === null || value === '') return mask(value)
  // Always mask in fetch helpers — safer default
  return SENSITIVE_RE.test(key) ? mask(value) : mask(value)
}

// ── CLI availability ─────────────────────────────────────────────────────
function cliAvailable(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// ── Parse .env content ───────────────────────────────────────────────────
function parseEnvContent(content) {
  const out = {}
  content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .forEach(l => {
      const idx = l.indexOf('=')
      if (idx <= 0) return
      const key = l.slice(0, idx).trim()
      let value = l.slice(idx + 1).trim()
      // Strip surrounding quotes if any
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      out[key] = value
    })
  return out
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null
  return parseEnvContent(fs.readFileSync(filePath, 'utf8'))
}

// ── Fetch Vercel ─────────────────────────────────────────────────────────
/**
 * Fetch all production env vars for each Vercel project.
 * Returns: { [projectName]: { [key]: value } }
 *
 * Uses `vercel env pull` to materialise values into a temp file, then parses
 * it. `vercel env ls` does not reveal values.
 */
function listVercelTeams() {
  try {
    const out = execSync(`vercel teams ls`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30_000,
    }).toString('utf8')
    // Lines look like: "  id   name   created ..." — extract slug-like tokens
    const slugs = []
    for (const line of out.split('\n')) {
      const m = line.match(/\b([a-z0-9-]{3,})\b/g)
      if (m) {
        for (const tok of m) {
          if (tok.startsWith('team') || tok.length < 4) continue
          if (!slugs.includes(tok)) slugs.push(tok)
        }
      }
    }
    return slugs
  } catch {
    return []
  }
}

function fetchVercelEnv({ cwd, projects = VERCEL_PROJECTS, scopes, log = () => {} } = {}) {
  const result = {}
  if (!cliAvailable('vercel')) {
    log('  ⚠  Vercel CLI not found. Install: pnpm add -g vercel')
    return result
  }

  // Scopes to try in order. Env takes precedence; falls back to probing teams.
  const envScope =
    process.env.VERCEL_SCOPE || process.env.VERCEL_TEAM_SLUG || process.env.VERCEL_TEAM_ID || ''
  const candidateScopes = scopes && scopes.length ? scopes : envScope ? [envScope] : null

  const tmpRoot = path.join(cwd || process.cwd(), 'tmp', 'secrets-vercel-fetch')
  fs.mkdirSync(tmpRoot, { recursive: true })

  for (const project of projects) {
    const projDir = path.join(tmpRoot, project)
    fs.mkdirSync(projDir, { recursive: true })
    const outFile = path.join(projDir, '.env.pull')

    const scopesToTry = candidateScopes || ['dfrancks-projects', 'odasie']
    let linked = false
    let lastErr = null

    for (const scope of scopesToTry) {
      try {
        execSync(`vercel link -p ${project} --scope ${scope} --yes --cwd "${projDir}"`, {
          stdio: 'pipe',
          timeout: 30_000,
        })
        linked = true
        break
      } catch (err) {
        lastErr = err
      }
    }

    if (!linked) {
      log(
        `  ❌ vercel/${project} — link failed: ${(lastErr && lastErr.message.split('\n')[0]) || 'unknown'}`
      )
      try {
        fs.rmSync(projDir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
      continue
    }

    try {
      execSync(`vercel env pull "${outFile}" --environment=production --yes --cwd "${projDir}"`, {
        stdio: 'pipe',
        timeout: 60_000,
      })
      const parsed = parseEnvFile(outFile)
      if (parsed) {
        result[project] = parsed
        log(`  ✅ vercel/${project} — ${Object.keys(parsed).length} var(s)`)
      } else {
        log(`  ⚠  vercel/${project} — empty pull`)
      }
    } catch (err) {
      log(`  ❌ vercel/${project} — pull failed: ${err.message.split('\n')[0]}`)
    } finally {
      try {
        fs.rmSync(projDir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }
  }

  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  } catch {
    /* ignore */
  }

  return result
}

// ── Fetch Railway ────────────────────────────────────────────────────────
/**
 * Fetch all production env vars for each Railway service.
 * Returns: { [serviceName]: { [key]: value } }
 */
function fetchRailwayEnv({ cwd, services = RAILWAY_SERVICES, log = () => {} } = {}) {
  const result = {}
  if (!cliAvailable('railway')) {
    log('  ⚠  Railway CLI not found. Install: npm i -g @railway/cli')
    return result
  }

  for (const { service, project } of services) {
    try {
      execSync(`railway link -p ${project} -s ${service} -e production`, {
        stdio: 'pipe',
        timeout: 15_000,
        cwd: cwd || process.cwd(),
      })
      // `railway variables --kv` returns KEY=VALUE lines
      const out = execSync(`railway variables --kv`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30_000,
        cwd: cwd || process.cwd(),
      }).toString('utf8')
      const parsed = parseEnvContent(out)
      result[service] = parsed
      log(`  ✅ railway/${service} — ${Object.keys(parsed).length} var(s)`)
    } catch (err) {
      log(`  ❌ railway/${service} — failed: ${err.message.split('\n')[0]}`)
    }
  }

  return result
}

// ── Aggregate helper ─────────────────────────────────────────────────────
/**
 * Flatten { provider: { project: { key: value } } } into per-key analysis:
 *   { [key]: { [ "vercel/<proj>" | "railway/<svc>" ]: value } }
 */
function buildVarIndex({ vercel = {}, railway = {} }) {
  const index = {}
  for (const [project, vars] of Object.entries(vercel)) {
    for (const [key, value] of Object.entries(vars)) {
      index[key] = index[key] || {}
      index[key][`vercel/${project}`] = value
    }
  }
  for (const [service, vars] of Object.entries(railway)) {
    for (const [key, value] of Object.entries(vars)) {
      index[key] = index[key] || {}
      index[key][`railway/${service}`] = value
    }
  }
  return index
}

/**
 * For a given var occurrences { source: value }, return:
 *   { uniqueValues: Set, isShared: boolean, isConflict: boolean,
 *     consensusValue: string | null, sources: string[] }
 */
function classifyVar(occurrences) {
  const sources = Object.keys(occurrences)
  const uniqueValues = new Set(Object.values(occurrences))
  const isShared = sources.length >= 2
  const isConflict = uniqueValues.size > 1
  // Consensus = most common value if any
  let consensusValue = null
  if (!isConflict) {
    consensusValue = [...uniqueValues][0]
  } else {
    const counts = {}
    for (const v of Object.values(occurrences)) counts[v] = (counts[v] || 0) + 1
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (sorted[0][1] > (sorted[1] ? sorted[1][1] : 0)) consensusValue = sorted[0][0]
  }
  return { uniqueValues, isShared, isConflict, consensusValue, sources }
}

// ── Write .env file with sections ────────────────────────────────────────
const SECTION_MAP = [
  { title: 'AI providers', match: k => /^(OPENAI|ANTHROPIC|GEMINI)_/.test(k) },
  { title: 'Email (Resend)', match: k => /^RESEND_/.test(k) },
  { title: 'Sentry org', match: k => /^SENTRY_/.test(k) },
  { title: 'MongoDB Atlas', match: k => /^MONGODB_ATLAS_/.test(k) },
  {
    title: 'Infra CLIs',
    match: k => /^(VERCEL_|RAILWAY_TOKEN|GITHUB_TOKEN|GITHUB_USERNAME)/.test(k),
  },
  { title: 'External APIs', match: k => /^EXCHANGE_RATE_/.test(k) },
  { title: 'Public (NEXT_PUBLIC_*)', match: k => k.startsWith('NEXT_PUBLIC_') },
]

function groupIntoSections(vars) {
  const sections = SECTION_MAP.map(s => ({ title: s.title, vars: {} }))
  const other = { title: 'Other', vars: {} }
  for (const [key, value] of Object.entries(vars)) {
    const idx = SECTION_MAP.findIndex(s => s.match(key))
    if (idx >= 0) sections[idx].vars[key] = value
    else other.vars[key] = value
  }
  const all = [...sections, other].filter(s => Object.keys(s.vars).length > 0)
  return all
}

function renderEnvFile(vars, { header } = {}) {
  const lines = []
  if (header) {
    for (const l of header.split('\n')) lines.push(`# ${l}`)
    lines.push('')
  }
  const sections = groupIntoSections(vars)
  for (const section of sections) {
    lines.push(`# === ${section.title} ===`)
    for (const [key, value] of Object.entries(section.vars)) {
      lines.push(`${key}=${value}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

module.exports = {
  RAILWAY_SERVICES,
  VERCEL_PROJECTS,
  SENSITIVE_RE,
  mask,
  display,
  cliAvailable,
  parseEnvContent,
  parseEnvFile,
  fetchVercelEnv,
  fetchRailwayEnv,
  listVercelTeams,
  buildVarIndex,
  classifyVar,
  renderEnvFile,
  groupIntoSections,
}
