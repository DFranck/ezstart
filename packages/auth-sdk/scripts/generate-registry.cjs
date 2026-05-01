#!/usr/bin/env node

/**
 * generate-registry.cjs
 *
 * Auto-generates the auth-sdk component registry by scanning the
 * `src/components/index.ts` exports + props files. Output feeds the
 * `/components` showcase pages in `apps/ezauth/web`.
 *
 * Output: packages/auth-sdk/src/components/auth-sdk-registry.generated.ts
 *         (gitignored, rebuilt by `turbo run generate`)
 *
 * CommonJS (`.cjs`) because `@ezstart/auth-sdk` is an ESM package; this
 * keeps the existing `require(...)` style without an ESM rewrite. Mirror
 * of `packages/ui/scripts/generate-ui-registry.cjs`.
 *
 * Usage: via `turbo run generate` or directly:
 *        `node packages/auth-sdk/scripts/generate-registry.cjs`
 */

const fs = require('fs')
const path = require('path')

// ─── Configuration ──────────────────────────────────────────

// From packages/auth-sdk/scripts/ → monorepo root is three levels up.
const ROOT = path.resolve(__dirname, '../../..')
const SDK_PKG = path.join(ROOT, 'packages/auth-sdk/src/components')
const SDK_ROOT = path.join(ROOT, 'packages/auth-sdk/src')
const OUTPUT = path.join(SDK_PKG, 'auth-sdk-registry.generated.ts')
const COMPONENTS_INDEX = path.join(SDK_PKG, 'index.ts')
const ROOT_INDEX = path.join(SDK_ROOT, 'index.ts')
const REPO_BASE = 'https://github.com/DFranck/ezstart/blob/master/packages/auth-sdk/src/'

/**
 * Manual category mapping for components that live at `src/components/`
 * root. Components inside subdirectories (`./modals/`, `./developer/`,
 * etc.) infer their category from the path automatically.
 *
 * Components can override the inferred category by adding an
 * `@category <name>` tag in their TSDoc (caught by the regex below).
 */
const ROOT_CATEGORY_MAP = {
  DevModeBanner: 'Banners & Loaders',
  AuthErrorBanner: 'Banners & Loaders',
  ScopeContextIndicator: 'Banners & Loaders',
  RequireAuthLoader: 'Banners & Loaders',
  SignInForm: 'Forms',
  SignUpForm: 'Forms',
  QuickSignUpForm: 'Forms',
  ForgotPasswordForm: 'Forms',
  ResetPasswordForm: 'Forms',
  OAuthButtons: 'OAuth',
  OAuthProvidersSection: 'OAuth',
  PasswordStrength: 'Password',
  TwoFactorPrompt: 'Two-Factor',
  TwoFactorSettings: 'Two-Factor',
  VerifyEmailFlow: 'Email Verification',
  EmailVerificationStatus: 'Email Verification',
  SessionsManager: 'Sessions',
  AuditLogSection: 'Audit & Danger',
  DeleteAccountSection: 'Audit & Danger',
  UserMenu: 'User Identity',
  AccountModal: 'User Identity',
  UserAvatar: 'User Identity',
  UserSettings: 'User Identity',
  UserDashboard: 'Dashboards',
  EZAuthDashboard: 'Dashboards',
  AuthAdminDashboard: 'Dashboards',
  LoginButton: 'Buttons',
  RegisterButton: 'Buttons',
  AuthCallbackPage: 'Misc',
  SignedIn: 'Misc',
  SignedOut: 'Misc',
}

/**
 * Map a sub-directory under `src/components/` to a friendly category
 * label. Path segments are matched case-insensitively against the keys.
 */
const PATH_CATEGORY_MAP = {
  modals: 'Modals',
  developer: 'Developer Portal',
  applications: 'Applications',
  'user-menu-v2': 'User Identity (V2)',
  admin: 'Admin',
  dashboard: 'Dashboards',
  account: 'User Identity',
}

/** Components we intentionally skip from the registry (utility hooks, internal). */
const SKIP_COMPONENTS = new Set([
  // Hooks & non-component utilities exported from index.ts
  'usePromoCode',
])

// ─── Helpers ────────────────────────────────────────────────

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

function isComponentName(name) {
  if (!name) return false
  if (!/^[A-Z]/.test(name)) return false
  if (name.startsWith('use')) return false
  if (/^[A-Z][A-Z_0-9]+$/.test(name) && (name.includes('_') || name.length > 4)) return false
  if (name.endsWith('Props') || name.endsWith('Texts') || name.endsWith('Config')) return false
  if (name.endsWith('Variants') || name.endsWith('VariantConfig')) return false
  if (name.startsWith('default') || name.startsWith('DEFAULT_')) return false
  return true
}

/**
 * Resolve a relative import path to an actual file path (.tsx or .ts).
 */
function resolveSourceFile(fromDir, importPath) {
  const cleanPath = importPath.replace(/\.js$/, '')
  const basePath = path.resolve(fromDir, cleanPath)
  const candidates = [
    basePath + '.tsx',
    basePath + '.ts',
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.ts'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Walk an index file recursively and return Map<componentName, sourcePath>.
 */
function collectExports(indexPath) {
  const content = readFile(indexPath)
  if (!content) return new Map()

  const dir = path.dirname(indexPath)
  const entries = new Map()

  // Pattern: export { Foo, Bar } from '../path'
  const namedExportRegex = /export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = namedExportRegex.exec(content)) !== null) {
    // Skip type exports
    const prefix = content.substring(Math.max(0, match.index - 15), match.index)
    if (prefix.includes('export type')) continue

    const names = match[1]
      .split(',')
      .map(n => {
        const cleaned = n.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
        if (!cleaned || cleaned.startsWith('type ')) return null
        const parts = cleaned.split(/\s+as\s+/)
        return parts.length > 1 ? parts[1].trim() : parts[0].trim()
      })
      .filter(n => n && isComponentName(n) && !SKIP_COMPONENTS.has(n))

    const sourcePath = resolveSourceFile(dir, match[2])
    if (!sourcePath) continue

    // If we landed on an index.ts, recurse
    if (path.basename(sourcePath) === 'index.ts' || path.basename(sourcePath) === 'index.tsx') {
      const sub = collectExports(sourcePath)
      for (const name of names) {
        if (sub.has(name)) entries.set(name, sub.get(name))
      }
    } else {
      for (const name of names) {
        entries.set(name, sourcePath)
      }
    }
  }

  return entries
}

/**
 * Extract the leading TSDoc comment block of a component, plus any
 * `@example` blocks that appear within that comment.
 */
function extractDocAndExamples(content, componentName) {
  // Find the export/declaration of the component
  // Patterns: export function Name, export const Name, function Name (with later export {Name})
  const declRegex = new RegExp(
    `(?:export\\s+)?(?:function|const)\\s+${componentName}\\b`
  )
  const declMatch = declRegex.exec(content)
  if (!declMatch) return { summary: '', description: '', examples: [] }

  // Walk backwards from the declaration to find the IMMEDIATELY preceding
  // /** */ block. Slice off everything after the declaration first, then
  // find the LAST `*/` and capture from the matching `/**` to it. This
  // avoids the greedy-match trap where `[\s\S]*?` would still grab from
  // the first `/**` in the file when anchored at `$`.
  const before = content.slice(0, declMatch.index)
  const lastClose = before.lastIndexOf('*/')
  if (lastClose === -1) return { summary: '', description: '', examples: [] }
  // Anything between the last `*/` and the declaration must be only
  // whitespace — otherwise the comment is not attached to the declaration.
  const tail = before.slice(lastClose + 2)
  if (tail.trim() !== '') return { summary: '', description: '', examples: [] }
  const lastOpen = before.lastIndexOf('/**', lastClose)
  if (lastOpen === -1) return { summary: '', description: '', examples: [] }
  const raw = before.slice(lastOpen + 3, lastClose).replace(/\r/g, '')
  const lines = raw.split('\n').map(l => l.replace(/^\s*\*\s?/, ''))

  // Split: prose lines until first @tag, then examples
  const examples = []
  const proseLines = []
  let inExample = false
  let currentExample = []

  for (const line of lines) {
    if (line.match(/^@example\b/)) {
      if (currentExample.length > 0) {
        examples.push(currentExample.join('\n').trim())
        currentExample = []
      }
      inExample = true
      const inline = line.replace(/^@example\b\s*/, '').trim()
      if (inline) currentExample.push(inline)
      continue
    }
    if (line.match(/^@\w+/) && !inExample) {
      // Other tag, ignore for prose but stop accumulating
      continue
    }
    if (line.match(/^@\w+/) && inExample) {
      // New tag inside example (e.g. @category) — close example
      if (currentExample.length > 0) {
        examples.push(currentExample.join('\n').trim())
        currentExample = []
      }
      inExample = false
      continue
    }
    if (inExample) {
      currentExample.push(line)
    } else {
      proseLines.push(line)
    }
  }
  if (currentExample.length > 0) {
    examples.push(currentExample.join('\n').trim())
  }

  const prose = proseLines.join('\n').trim()
  const firstParagraph = prose.split(/\n\s*\n/)[0] || ''
  const summary = firstParagraph.split(/[.!?](\s|$)/)[0].trim()
  const description = prose

  return { summary, description, examples }
}

/**
 * Extract @category tag value from a TSDoc block.
 */
function extractCategoryTag(content, componentName) {
  const declRegex = new RegExp(
    `(?:export\\s+)?(?:function|const)\\s+${componentName}\\b`
  )
  const declMatch = declRegex.exec(content)
  if (!declMatch) return null
  const before = content.slice(0, declMatch.index)
  const lastClose = before.lastIndexOf('*/')
  if (lastClose === -1) return null
  const tail = before.slice(lastClose + 2)
  if (tail.trim() !== '') return null
  const lastOpen = before.lastIndexOf('/**', lastClose)
  if (lastOpen === -1) return null
  const raw = before.slice(lastOpen + 3, lastClose)
  const tagMatch = raw.match(/@category\s+([^\n]+)/)
  return tagMatch ? tagMatch[1].trim().replace(/\*$/, '').trim() : null
}

/**
 * Detect if a component declaration is marked `@internal` in its
 * immediately-preceding TSDoc block. Defensive filter — even if an
 * @internal-tagged component leaks into the components index, it should
 * not be surfaced in the public registry / docs.
 *
 * Returns true ONLY when the `@internal` tag is found inside the comment
 * block directly attached to the named declaration. Comments that appear
 * earlier in the file are ignored.
 */
function isInternalComponent(content, componentName) {
  const declRegex = new RegExp(
    `(?:export\\s+)?(?:function|const)\\s+${componentName}\\b`
  )
  const declMatch = declRegex.exec(content)
  if (!declMatch) return false
  const before = content.slice(0, declMatch.index)
  const lastClose = before.lastIndexOf('*/')
  if (lastClose === -1) return false
  // Comment must be directly attached (only whitespace between */ and decl)
  const tail = before.slice(lastClose + 2)
  if (tail.trim() !== '') return false
  const lastOpen = before.lastIndexOf('/**', lastClose)
  if (lastOpen === -1) return false
  const raw = before.slice(lastOpen + 3, lastClose)
  return /@internal\b/.test(raw)
}

/**
 * Extract content between matching braces, starting after the opening
 * brace.
 */
function extractBraceBlock(content, startIdx) {
  let depth = 1
  let i = startIdx
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') depth--
    i++
  }
  if (depth !== 0) return null
  return content.substring(startIdx, i - 1)
}

/**
 * Extract props from a `<ComponentName>Props` interface or type alias.
 * Returns an array of { name, type, required, defaultValue, description }.
 */
function extractProps(filePath, componentName) {
  const content = readFile(filePath)
  if (!content) return []

  const propsName = `${componentName}Props`

  // Find the props interface/type
  const patterns = [
    new RegExp(`(?:export\\s+)?interface\\s+${propsName}\\s+extends\\s+[^{]*\\{`),
    new RegExp(`(?:export\\s+)?interface\\s+${propsName}\\s*\\{`),
    new RegExp(`(?:export\\s+)?type\\s+${propsName}\\s*=\\s*[^{]*\\{`),
  ]

  let propsBlock = null
  for (const pattern of patterns) {
    const match = pattern.exec(content)
    if (match) {
      const startIdx = match.index + match[0].length
      propsBlock = extractBraceBlock(content, startIdx)
      if (propsBlock) break
    }
  }

  if (!propsBlock) return []

  // Walk through prop declarations. Each prop may be preceded by a
  // /** */ comment. We use a stateful parser to associate comments
  // with their following declaration.
  const props = []
  const seen = new Set()
  let i = 0
  let pendingComment = ''

  while (i < propsBlock.length) {
    // Skip whitespace
    while (i < propsBlock.length && /\s/.test(propsBlock[i])) i++
    if (i >= propsBlock.length) break

    // Comment block
    if (propsBlock.slice(i, i + 3) === '/**') {
      const end = propsBlock.indexOf('*/', i + 3)
      if (end === -1) break
      pendingComment = propsBlock
        .slice(i + 3, end)
        .split('\n')
        .map(l => l.replace(/^\s*\*\s?/, '').trim())
        .filter(l => l && !l.startsWith('@'))
        .join(' ')
        .trim()
      i = end + 2
      continue
    }
    if (propsBlock.slice(i, i + 2) === '//') {
      // Single-line comment, skip
      const nl = propsBlock.indexOf('\n', i)
      i = nl === -1 ? propsBlock.length : nl + 1
      continue
    }

    // Prop declaration: name(?): type
    const restAtI = propsBlock.slice(i)
    const propMatch = restAtI.match(/^(\w+)(\??)\s*:\s*/)
    if (!propMatch) {
      // Skip this character
      i++
      continue
    }

    const name = propMatch[1]
    const optional = propMatch[2] === '?'
    let typeStart = i + propMatch[0].length

    // Find end of type (terminator: top-level `;`, `,`, end of line not
    // continued, or start of next JSDoc block) — but careful with nested
    // generics, object types, function types.
    //
    // We track parens/brackets/braces precisely. We do NOT track `<>` as
    // depth changes because `<` and `>` are heavily overloaded in
    // TypeScript: arrow functions (`=>`), comparisons (`<=`, `>=`), and
    // JSX would all confuse us. Generics are usually self-contained so
    // newline-at-depth-0 is the dominant terminator.
    let depth = 0
    let typeEnd = typeStart
    while (typeEnd < propsBlock.length) {
      const c = propsBlock[typeEnd]
      // Detect start of next JSDoc block at depth 0 — that's a hard
      // boundary (no type ever spans across an upcoming prop's TSDoc).
      if (depth === 0 && propsBlock.slice(typeEnd, typeEnd + 3) === '/**') break
      if (depth === 0 && propsBlock.slice(typeEnd, typeEnd + 2) === '//') break
      if (c === '{' || c === '(' || c === '[') depth++
      else if (c === '}' || c === ')' || c === ']') depth--
      else if (depth === 0 && (c === ';' || c === ',' || c === '\n')) break
      typeEnd++
    }

    const rawType = propsBlock.slice(typeStart, typeEnd).trim()

    if (!seen.has(name) && !['children', 'className', 'style', 'ref', 'key'].includes(name)) {
      seen.add(name)
      props.push({
        name,
        type: rawType.replace(/\s+/g, ' '),
        required: !optional,
        defaultValue: null,
        description: pendingComment,
      })
    }

    pendingComment = ''
    i = typeEnd + 1
  }

  return props
}

/**
 * Friendly category for a component.
 *
 * Priority:
 * 1. `@category <name>` TSDoc tag in the source file
 * 2. Path-based inference (subdirectory under `src/components/`)
 * 3. Manual root-level mapping
 * 4. Fallback `'Misc'`
 */
function resolveCategory(name, sourcePath) {
  const content = readFile(sourcePath)
  if (content) {
    const tag = extractCategoryTag(content, name)
    if (tag) return tag
  }

  const relative = path.relative(SDK_PKG, sourcePath).replace(/\\/g, '/')
  const segments = relative.split('/')
  if (segments.length > 1) {
    const sub = segments[0]
    if (PATH_CATEGORY_MAP[sub]) return PATH_CATEGORY_MAP[sub]
  }

  if (ROOT_CATEGORY_MAP[name]) return ROOT_CATEGORY_MAP[name]
  return 'Misc'
}

/**
 * Determine if a component is a compound (exports sub-components).
 * Rough heuristic: source file or sibling exports multiple PascalCase
 * names.
 */
function detectCompound(name, sourcePath) {
  const content = readFile(sourcePath)
  if (!content) return { isCompound: false, compoundParts: [] }

  // Find all exported function/const declarations matching PascalCase
  const exports = new Set()
  const fnRegex = /export\s+(?:function|const)\s+([A-Z]\w+)/g
  let match
  while ((match = fnRegex.exec(content)) !== null) {
    if (match[1] !== name && /^[A-Z]/.test(match[1])) {
      exports.add(match[1])
    }
  }

  const parts = [...exports]
  return {
    isCompound: parts.length > 0,
    compoundParts: parts,
  }
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  // Collect exports from BOTH the components barrel and the root index.
  // Root-exported components (LoginButton, RegisterButton, SignedIn,
  // SignedOut, AuthCallbackPage) consume from `@ezstart/auth-sdk`, while
  // components-barrel exports consume from `@ezstart/auth-sdk/components`.
  const componentsExports = collectExports(COMPONENTS_INDEX)
  const rootExports = collectExports(ROOT_INDEX)
  const merged = new Map()
  for (const [name, sourcePath] of componentsExports) {
    merged.set(name, { sourcePath, importPath: '@ezstart/auth-sdk/components' })
  }
  for (const [name, sourcePath] of rootExports) {
    // Skip if components barrel already exports it (avoid dupe rendering)
    if (merged.has(name)) continue
    // Only keep entries that look like UI components (file in src/components/)
    const rel = path.relative(SDK_ROOT, sourcePath).replace(/\\/g, '/')
    if (!rel.startsWith('components/')) continue
    merged.set(name, { sourcePath, importPath: '@ezstart/auth-sdk' })
  }

  const entries = []

  for (const [name, { sourcePath, importPath }] of merged) {
    if (SKIP_COMPONENTS.has(name)) continue
    if (!isComponentName(name)) continue

    const content = readFile(sourcePath)
    if (!content) continue

    // Skip components explicitly marked @internal in their TSDoc — they are
    // implementation details not meant for the public docs surface.
    if (isInternalComponent(content, name)) continue

    const { summary, description, examples } = extractDocAndExamples(content, name)
    const category = resolveCategory(name, sourcePath)
    const props = extractProps(sourcePath, name)
    const compound = detectCompound(name, sourcePath)

    const sourceUrl = REPO_BASE + path.relative(SDK_ROOT, sourcePath).replace(/\\/g, '/')

    entries.push({
      name,
      category,
      summary: summary || '',
      description: description || '',
      examples,
      props,
      importPath,
      sourceUrl,
      isCompound: compound.isCompound,
      compoundParts: compound.compoundParts,
    })
  }

  // Sort within each category by name for deterministic diff
  entries.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return a.name.localeCompare(b.name)
  })

  // Build category index
  const categoryMap = new Map()
  for (const entry of entries) {
    if (!categoryMap.has(entry.category)) categoryMap.set(entry.category, [])
    categoryMap.get(entry.category).push(entry.name)
  }
  const categories = [...categoryMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, components]) => ({ name: cat, components }))

  const output = [
    '/**',
    ' * AUTO-GENERATED — do not edit by hand.',
    ' *',
    ' * Regenerate via `pnpm --filter @ezstart/auth-sdk generate`',
    ' * (or `turbo run generate`). Source: `scripts/generate-registry.cjs`.',
    ' */',
    '',
    'export interface ComponentEntry {',
    '  /** Exported component name (e.g. "SignInModal") */',
    '  name: string',
    '  /** Friendly category label (e.g. "Modals", "Forms") */',
    '  category: string',
    '  /** Single-line summary parsed from the TSDoc */',
    '  summary: string',
    '  /** Full TSDoc paragraph (may include markdown) */',
    '  description: string',
    '  /** Code blocks extracted from `@example` JSDoc tags */',
    '  examples: string[]',
    '  /** Public props extracted from the `XxxProps` interface */',
    '  props: Array<{',
    '    name: string',
    '    type: string',
    '    required: boolean',
    '    defaultValue: string | null',
    '    description: string',
    '  }>',
    '  /** Module path consumers should import from */',
    '  importPath: string',
    '  /** GitHub URL pointing to the source file */',
    '  sourceUrl: string',
    '  /** True if the component file exports additional PascalCase names */',
    '  isCompound: boolean',
    '  /** Names of the additional exports detected in the source file */',
    '  compoundParts: string[]',
    '}',
    '',
    'export interface CategoryEntry {',
    '  /** Friendly category label */',
    '  name: string',
    '  /** Component names belonging to this category, sorted alphabetically */',
    '  components: string[]',
    '}',
    '',
    `export const componentRegistry: ComponentEntry[] = ${JSON.stringify(entries, null, 2)} as const`,
    '',
    `export const categories: CategoryEntry[] = ${JSON.stringify(categories, null, 2)} as const`,
    '',
    '/** Lookup helper — returns the registry entry for a given component name. */',
    'export function getComponent(name: string): ComponentEntry | undefined {',
    '  return componentRegistry.find(c => c.name === name)',
    '}',
    '',
    '/** Slug helpers — used by the `/components/<category>/<component>` routing. */',
    'export function categoryToSlug(name: string): string {',
    "  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')",
    '}',
    '',
    'export function componentToSlug(name: string): string {',
    "  return name.replace(/([A-Z])/g, (m, c, i) => (i === 0 ? c.toLowerCase() : '-' + c.toLowerCase()))",
    '}',
    '',
    'export function getCategoryBySlug(slug: string): CategoryEntry | undefined {',
    '  return categories.find(c => categoryToSlug(c.name) === slug)',
    '}',
    '',
    'export function getComponentBySlug(slug: string): ComponentEntry | undefined {',
    '  return componentRegistry.find(c => componentToSlug(c.name) === slug)',
    '}',
    '',
  ].join('\n')

  // Atomic write: write to a temp file first, then rename. Eliminates any
  // window where the registry file exists in a half-written state on disk
  // (HMR / concurrent reader / crashed run).
  const tmpPath = OUTPUT + '.tmp'
  fs.writeFileSync(tmpPath, output)
  fs.renameSync(tmpPath, OUTPUT)
  console.log(
    `[auth-sdk:generate] Wrote ${entries.length} components in ${categories.length} categories → ${path.relative(ROOT, OUTPUT)}`
  )
}

main()
