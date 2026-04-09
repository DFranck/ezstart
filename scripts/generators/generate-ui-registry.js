#!/usr/bin/env node

/**
 * generate-ui-registry.js
 *
 * Auto-generates the Design System Inspector registry by scanning
 * packages/ui component files. Extracts component names, props,
 * design tokens, and children relationships.
 *
 * Usage: node scripts/generators/generate-ui-registry.js
 *        pnpm registry:update
 */

const fs = require('fs')
const path = require('path')

// ─── Configuration ──────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../..')
const UI_PKG = path.join(ROOT, 'packages/ui/src/components')
const OUTPUT = path.join(
  ROOT,
  'apps/ezstart/web/src/app/[locale]/(views)/packages/ui/inspector/registry.ts'
)

const LEVEL_INDEXES = {
  base: path.join(UI_PKG, 'base/index.ts'),
  composed: path.join(UI_PKG, 'composed/index.ts'),
  complex: path.join(UI_PKG, 'complex/index.ts'),
}

/** Props that are always design tokens */
const DESIGN_TOKEN_NAMES = new Set(['density', 'size', 'variant', 'colorScheme'])

/** Structural tokens propagate through the component tree */
const STRUCTURAL_TOKENS = new Set(['density', 'size'])

/** Categorize a token as structural (propagates) or visual (local only) */
function categorizeToken(name) {
  return STRUCTURAL_TOKENS.has(name) ? 'structural' : 'visual'
}

// ─── Helpers ────────────────────────────────────────────────

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Parse an index file to extract exported component names and their source paths.
 * Returns Map<componentName, relativeSourcePath>
 */
function parseIndexExports(indexPath) {
  const content = readFile(indexPath)
  if (!content) {
    console.warn(`  WARNING: Could not read ${indexPath}`)
    return new Map()
  }

  const dir = path.dirname(indexPath)
  const entries = new Map()

  // Pattern 1: export * from '../path'
  // Pattern 2: export { Name1, Name2 } from '../path'
  // Pattern 3: export { Name as Alias } from '../path'
  // Pattern 4: export type { ... } from '../path' (skip these)
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip type-only exports and comments
    if (trimmed.startsWith('export type') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      continue
    }

    // Skip re-exports from external packages
    if (trimmed.includes("from '@tanstack") || trimmed.includes("from 'react")) {
      continue
    }

    // Match: export * from '../path'
    const starMatch = trimmed.match(/^export\s+\*\s+from\s+['"]([^'"]+)['"]/)
    if (starMatch) {
      const sourcePath = resolveSourceFile(dir, starMatch[1])
      if (sourcePath) {
        const names = extractExportedNames(sourcePath)
        for (const name of names) {
          if (isComponentName(name)) {
            entries.set(name, sourcePath)
          }
        }
      }
      continue
    }

    // Match: export { Name1, Name2 } from '../path'
    // Also handles multi-line via accumulation
    const namedMatch = trimmed.match(/^export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/)
    if (namedMatch) {
      const names = namedMatch[1]
        .split(',')
        .map(n => {
          const parts = n.trim().split(/\s+as\s+/)
          return parts.length > 1 ? parts[1].trim() : parts[0].trim()
        })
        .filter(n => isComponentName(n))

      const sourcePath = resolveSourceFile(dir, namedMatch[2])
      if (sourcePath) {
        for (const name of names) {
          entries.set(name, sourcePath)
        }
      }
      continue
    }

    // Handle multi-line exports: export {\n  Name1,\n  Name2,\n} from '../path'
    // We'll handle these by joining lines between export { and } from
  }

  // Second pass: handle multi-line exports
  const multiLineRegex = /export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = multiLineRegex.exec(content)) !== null) {
    // Skip if it's a type export
    const prefix = content.substring(Math.max(0, match.index - 15), match.index)
    if (prefix.includes('export type')) continue

    const names = match[1]
      .split(',')
      .map(n => {
        const cleaned = n
          .trim()
          .replace(/\/\/.*$/, '')
          .replace(/\/\*.*?\*\//g, '')
        if (!cleaned) return null
        // Handle 'type X' entries within named exports
        if (cleaned.startsWith('type ')) return null
        const parts = cleaned.split(/\s+as\s+/)
        return parts.length > 1 ? parts[1].trim() : parts[0].trim()
      })
      .filter(n => n && isComponentName(n))

    const sourcePath = resolveSourceFile(dir, match[2])
    if (sourcePath) {
      for (const name of names) {
        if (!entries.has(name)) {
          entries.set(name, sourcePath)
        }
      }
    }
  }

  return entries
}

/**
 * Resolve a relative import path to an actual file path (.tsx or .ts)
 */
function resolveSourceFile(fromDir, importPath) {
  // Remove .js extension if present (TypeScript source files)
  const cleanPath = importPath.replace(/\.js$/, '')
  const basePath = path.resolve(fromDir, cleanPath)

  // Try .tsx, .ts, /index.tsx, /index.ts
  const candidates = [
    basePath + '.tsx',
    basePath + '.ts',
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.ts'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

/**
 * Check if a name looks like a React component (PascalCase, not a type/hook)
 */
function isComponentName(name) {
  if (!name) return false
  // Must start with uppercase
  if (!/^[A-Z]/.test(name)) return false
  // Skip hooks (useXxx)
  if (name.startsWith('use')) return false
  // Skip ALL_CAPS constants (e.g., INTENT_ARIA_MAP, DEFAULT_DIV_VARIANTS)
  // But keep short names like H1, H2, P, UL, LI which are valid component names
  if (/^[A-Z][A-Z_0-9]+$/.test(name) && (name.includes('_') || name.length > 3)) return false
  // Skip common non-component exports
  if (name.endsWith('Props') || name.endsWith('Variants') || name.endsWith('Config')) return false
  // Skip variant functions/objects (camelCase starting with lowercase handled by first check)
  if (name.includes('variants') || name.includes('Variants')) return false
  if (name.includes('VariantConfig') || name.includes('variantConfig')) return false
  // Skip type-like names and data types
  if (['SlideData', 'Stat', 'Feature', 'UseCase', 'Step', 'StepButton'].includes(name)) return false
  // Skip known non-components (config exports, variant maps, etc.)
  const nonComponents = [
    'INTENT_ARIA_MAP',
    // variant config objects (lowercase start but caught by PascalCase check anyway)
  ]
  if (nonComponents.includes(name)) return false
  return true
}

/**
 * Extract exported component names from a source file
 */
function extractExportedNames(filePath) {
  const content = readFile(filePath)
  if (!content) return []

  const names = new Set()

  // Match: export function Name (only PascalCase that look like components)
  for (const m of content.matchAll(/export\s+function\s+([A-Z][A-Za-z0-9]*)/g)) {
    names.add(m[1])
  }

  // Match: export const Name = React.forwardRef / React.memo / function / (props) => / createAlias(...)
  // But NOT export const SOME_CONSTANT = 'value' or string/number/object literals
  for (const m of content.matchAll(/export\s+const\s+([A-Z][A-Za-z0-9]*)\s*=/g)) {
    const name = m[1]
    // Check what follows the = to determine if it's a component
    const afterEqual = content
      .substring(m.index + m[0].length, m.index + m[0].length + 100)
      .trimStart()
    // Accept: React.forwardRef, React.memo, function, arrow function, or factory function calls
    if (afterEqual.match(/^(React\.(forwardRef|memo)|function|\(|create[A-Z]\w*\()/)) {
      names.add(name)
    }
  }

  // Match: export { Name1, Name2 }
  for (const m of content.matchAll(/export\s+\{([^}]+)\}/g)) {
    // Skip type exports
    const prefix = content.substring(Math.max(0, m.index - 15), m.index)
    if (prefix.includes('export type')) continue

    for (const part of m[1].split(',')) {
      let cleaned = part.trim()
      // Skip 'type X' entries
      if (cleaned.startsWith('type ')) continue
      cleaned = cleaned.replace(/\s+as\s+\w+/, '')
      if (cleaned && /^[A-Z]/.test(cleaned)) {
        names.add(cleaned)
      }
    }
  }

  return [...names].filter(isComponentName)
}

/**
 * Extract props from a component source file.
 * Returns array of PropInfo objects.
 */
function extractProps(filePath, componentName) {
  const content = readFile(filePath)
  if (!content) return []

  const props = []

  // Find the props type/interface for this component
  // Patterns:
  //   type XxxProps = { ... }
  //   interface XxxProps { ... }
  //   interface XxxProps extends ... { ... }

  // Try component-specific props first, then generic patterns
  // Handles: type XxxProps = { ... }
  //          interface XxxProps { ... }
  //          interface XxxProps extends Yyy { ... }
  //          type XxxProps = Yyy & { ... }
  const propsPatterns = [
    new RegExp(`(?:type|interface)\\s+${componentName}Props[^{]*\\{`, 's'),
    // Also match without component name prefix for files with single component
    /(?:type|interface)\s+(\w+Props)[^{]*\{/s,
  ]

  let propsBlock = null

  for (const pattern of propsPatterns) {
    // Use exec with lastIndex=0 to find the FIRST match for the specific component
    const regex = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
    )
    regex.lastIndex = 0
    const match = regex.exec(content)
    if (match) {
      // Find the matching closing brace
      const startIdx = match.index + match[0].length
      propsBlock = extractBraceBlock(content, startIdx)
      if (propsBlock) break
    }
  }

  // Also check for inline type in function signature:
  // function Component({ ... }: ParentProps & { variant?: '...' })
  if (!propsBlock) {
    const inlineMatch = content.match(
      new RegExp(`function\\s+${componentName}\\s*\\(\\s*\\{[^}]*\\}\\s*:\\s*[^{]*\\{`, 's')
    )
    if (inlineMatch) {
      const startIdx = inlineMatch.index + inlineMatch[0].length
      propsBlock = extractBraceBlock(content, startIdx)
    }
  }

  if (!propsBlock) return []

  // Parse individual props from the block
  // Pattern: propName?: type  or  propName: type
  const propRegex = /^\s*\/\*\*[^]*?\*\/\s*\n\s*(\w+)(\??)\s*:\s*([^\n]+)/gm
  const simplePropRegex = /^\s*(\w+)(\??)\s*:\s*([^\n]+)/gm

  // Use simple regex to get all props
  let propMatch
  const seen = new Set()

  while ((propMatch = simplePropRegex.exec(propsBlock)) !== null) {
    const [, name, optional, rawType] = propMatch

    // Skip if already seen
    if (seen.has(name)) continue
    seen.add(name)

    // Clean up the type
    let type = rawType
      .trim()
      .replace(/\/\/.*$/, '') // Remove line comments
      .replace(/,\s*$/, '') // Remove trailing comma
      .replace(/;\s*$/, '') // Remove trailing semicolon
      .trim()

    // Skip non-prop lines (JSDoc content, etc.)
    if (!name || /^[*\/]/.test(name)) continue
    // Skip common non-design props
    if (['children', 'className', 'style', 'ref', 'key'].includes(name)) continue

    const isRequired = optional !== '?'
    const isDesignToken = DESIGN_TOKEN_NAMES.has(name) || isStringUnionType(type)

    props.push({
      name,
      type,
      required: isRequired,
      isDesignToken,
    })
  }

  return props
}

/**
 * Extract content between matching braces, starting after the opening brace
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
 * Check if a type string is a union of string literals: 'a' | 'b' | 'c'
 */
function isStringUnionType(type) {
  // Match patterns like: 'sm' | 'default' | 'lg'
  return /^['"][^'"]+['"]\s*(\|\s*['"][^'"]+['"]\s*)+$/.test(type.trim())
}

/**
 * Extract cva variant keys from a component source file.
 * Tries to match the cva block to the specific component by looking
 * for a const named `{componentName}Variants` or `{lowercase}Variants`.
 * Returns array of token names (variant, size, etc.)
 */
function extractCvaTokens(filePath, componentName) {
  const content = readFile(filePath)
  if (!content) return []

  const tokens = []

  // Try to find a cva block specifically for this component
  // Pattern: const buttonVariants = cva(...) or const cardVariants = cva(...)
  const lowerName = componentName.charAt(0).toLowerCase() + componentName.slice(1)
  const specificPattern = new RegExp(
    `const\\s+${lowerName}Variants\\s*=\\s*cva\\s*\\([^,]+,\\s*\\{\\s*variants\\s*:\\s*\\{`,
    's'
  )
  const specificMatch = content.match(specificPattern)

  if (specificMatch) {
    const block = extractBraceBlock(content, specificMatch.index + specificMatch[0].length)
    if (block) {
      const keyRegex = /^\s*(\w+)\s*:\s*\{/gm
      let keyMatch
      while ((keyMatch = keyRegex.exec(block)) !== null) {
        const tokenName = keyMatch[1]
        if (!['true', 'false'].includes(tokenName)) {
          tokens.push(tokenName)
        }
      }
      return [...new Set(tokens)]
    }
  }

  // Fallback: if there's only ONE cva block in the file AND only one component exported, use it
  const allCvaMatches = [...content.matchAll(/const\s+(\w+)\s*=\s*cva\s*\(/g)]
  if (allCvaMatches.length === 1) {
    // Check if the cva name matches this component (e.g., badgeVariants for Badge)
    const cvaName = allCvaMatches[0][1]
    const cvaComponentName = cvaName.replace(/Variants$/, '')
    // Only use if cva name matches this component
    if (cvaComponentName.toLowerCase() === componentName.toLowerCase()) {
      const cvaRegex = /cva\s*\(\s*[^,]+,\s*\{\s*variants\s*:\s*\{/g
      const match = cvaRegex.exec(content)
      if (match) {
        const block = extractBraceBlock(content, match.index + match[0].length)
        if (block) {
          const keyRegex = /^\s*(\w+)\s*:\s*\{/gm
          let keyMatch
          while ((keyMatch = keyRegex.exec(block)) !== null) {
            const tokenName = keyMatch[1]
            if (!['true', 'false'].includes(tokenName)) {
              tokens.push(tokenName)
            }
          }
        }
      }
    }
  }

  // Also check the component's own props interface for variant-like props
  // (e.g., CardHeaderProps with size?: 'xs' | 'sm' | ...)
  // This is handled by the props extraction, so we don't duplicate here

  return [...new Set(tokens)]
}

/**
 * Extract children components by scanning imports from other UI components.
 * Cross-references with all known component names.
 */
function extractChildren(filePath, allComponentNames) {
  const content = readFile(filePath)
  if (!content) return []

  const children = new Set()

  // Find imports from relative paths (other UI components)
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]\.\.?\/[^'"]+['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    for (const part of match[1].split(',')) {
      const name = part.trim().replace(/\s+as\s+\w+/, '')
      if (name && allComponentNames.has(name) && isComponentName(name)) {
        children.add(name)
      }
    }
  }

  // Also check for imports from @ezstart/ui
  const pkgImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@ezstart\/ui[^'"]*['"]/g
  while ((match = pkgImportRegex.exec(content)) !== null) {
    for (const part of match[1].split(',')) {
      const name = part.trim().replace(/\s+as\s+\w+/, '')
      if (name && allComponentNames.has(name) && isComponentName(name)) {
        children.add(name)
      }
    }
  }

  return [...children]
}

/**
 * Generate a description from the component name and its tokens/level.
 */
function generateDescription(name, level, tokens, children) {
  const parts = []

  if (level === 'base') {
    if (tokens.length > 0) {
      parts.push(`Base component with ${tokens.join(', ')} token${tokens.length > 1 ? 's' : ''}`)
    } else {
      parts.push('Base component')
    }
  } else if (level === 'composed') {
    if (children.length > 0) {
      parts.push(`Composed component using ${children.join(', ')}`)
    } else {
      parts.push('Composed component')
    }
    if (tokens.length > 0) {
      parts.push(`drills ${tokens.join(', ')} to children`)
    }
  } else {
    if (children.length > 0) {
      parts.push(`Complex component orchestrating ${children.join(', ')}`)
    } else {
      parts.push('Complex component')
    }
    if (tokens.length > 0) {
      parts.push(`drills ${tokens.join(', ')} through children`)
    }
  }

  return parts.join(' — ')
}

/**
 * Make a path relative to the monorepo root, using forward slashes
 */
function toRelativePath(absolutePath) {
  return path.relative(ROOT, absolutePath).replace(/\\/g, '/')
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  console.log('Design System Inspector — Registry Generator')
  console.log('=============================================\n')

  // Step 1: Scan all three level indexes
  const allComponents = new Map() // name -> { level, sourcePath }
  const allComponentNames = new Set()

  for (const [level, indexPath] of Object.entries(LEVEL_INDEXES)) {
    console.log(`Scanning ${level} components...`)
    const entries = parseIndexExports(indexPath)
    console.log(`  Found ${entries.size} components.\n`)

    for (const [name, sourcePath] of entries) {
      allComponents.set(name, { level, sourcePath })
      allComponentNames.add(name)
    }
  }

  console.log(`Total components found: ${allComponentNames.size}\n`)

  // Step 2: For each component, extract props, tokens, and children
  const registry = {}
  let processed = 0
  let skipped = 0

  for (const [name, { level, sourcePath }] of allComponents) {
    try {
      // Extract props
      const props = extractProps(sourcePath, name)

      // Extract tokens from cva variants
      const cvaTokens = extractCvaTokens(sourcePath, name)

      // Merge: tokens from cva + props that are design tokens
      const tokenSet = new Set(cvaTokens)
      for (const prop of props) {
        if (prop.isDesignToken) {
          tokenSet.add(prop.name)
        }
      }
      const tokens = [...tokenSet]

      // Extract children
      const children = extractChildren(sourcePath, allComponentNames)

      // Generate description
      const description = generateDescription(name, level, tokens, children)

      registry[name] = {
        name,
        level,
        tokens,
        props,
        children,
        description,
        sourcePath: toRelativePath(sourcePath),
      }

      processed++
    } catch (err) {
      console.warn(`  WARNING: Failed to process ${name}: ${err.message}`)
      skipped++
    }
  }

  console.log(`Processed: ${processed} components`)
  if (skipped > 0) console.log(`Skipped: ${skipped} components`)

  // Step 3: Build popular chains from components with children
  const popularChains = buildPopularChains(registry)

  // Step 4: Generate the output file
  const output = generateOutput(registry, popularChains)

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT, output, 'utf-8')
  console.log(`\nRegistry written to: ${toRelativePath(OUTPUT)}`)
  console.log(`  ${Object.keys(registry).length} components registered`)
  console.log(`  ${popularChains.length} popular chains`)
}

/**
 * Build popular chains: find interesting component hierarchies
 */
function buildPopularChains(registry) {
  const chains = []

  // Find complex components that have composed children which have base children
  for (const entry of Object.values(registry)) {
    if (entry.level !== 'complex' || entry.children.length === 0) continue

    for (const childName of entry.children) {
      const child = registry[childName]
      if (!child) continue

      if (child.level === 'composed' && child.children.length > 0) {
        // Find a base child
        for (const grandchildName of child.children) {
          const grandchild = registry[grandchildName]
          if (grandchild && grandchild.level === 'base') {
            chains.push({
              label: `${entry.name} → ${child.name} → ${grandchild.name}`,
              chain: [entry.name, child.name, grandchild.name],
            })
            break // One chain per composed child is enough
          }
        }
      }

      // Also add direct complex → base chains
      if (child.level === 'base' && child.tokens.length > 0) {
        chains.push({
          label: `${entry.name} → ${child.name}`,
          chain: [entry.name, child.name],
        })
      }
    }
  }

  // Find composed → base chains
  for (const entry of Object.values(registry)) {
    if (entry.level !== 'composed' || entry.children.length === 0) continue

    for (const childName of entry.children) {
      const child = registry[childName]
      if (child && child.level === 'base' && child.tokens.length > 0) {
        chains.push({
          label: `${entry.name} → ${child.name}`,
          chain: [entry.name, child.name],
        })
        break // One per composed
      }
    }
  }

  // Limit to 10 most interesting chains, prioritize longer ones
  return chains.sort((a, b) => b.chain.length - a.chain.length).slice(0, 10)
}

/**
 * Generate the TypeScript output file content
 */
function generateOutput(registry, popularChains) {
  const now = new Date().toISOString()

  const entries = Object.entries(registry).sort(([a], [b]) => a.localeCompare(b))

  // Group by level for readability
  const baseEntries = entries.filter(([, e]) => e.level === 'base')
  const composedEntries = entries.filter(([, e]) => e.level === 'composed')
  const complexEntries = entries.filter(([, e]) => e.level === 'complex')

  function formatProps(props) {
    if (props.length === 0) return '[]'
    const items = props.map(p => {
      const type = p.type.replace(/'/g, "'")
      return `      { name: '${p.name}', type: '${escapeString(type)}', required: ${p.required}, isDesignToken: ${p.isDesignToken} }`
    })
    return `[\n${items.join(',\n')},\n    ]`
  }

  function formatEntry([name, entry]) {
    const tokens =
      entry.tokens.length > 0
        ? `[${entry.tokens.map(t => `{ name: '${t}', category: '${categorizeToken(t)}' }`).join(', ')}]`
        : '[]'
    const children =
      entry.children.length > 0 ? `[${entry.children.map(c => `'${c}'`).join(', ')}]` : '[]'
    const props = formatProps(entry.props)

    return `  ${name}: {
    name: '${name}',
    level: '${entry.level}',
    tokens: ${tokens},
    props: ${props},
    children: ${children},
    description: '${escapeString(entry.description)}',
    sourcePath: '${entry.sourcePath}',
  }`
  }

  function escapeString(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  }

  const chainsStr = popularChains
    .map(c => {
      const chainArr = c.chain.map(n => `'${n}'`).join(', ')
      return `  { label: '${escapeString(c.label)}', chain: [${chainArr}] }`
    })
    .join(',\n')

  return `// AUTO-GENERATED by scripts/generators/generate-ui-registry.js — ${now}
// Run: pnpm registry:update
// DO NOT EDIT MANUALLY

export type ComponentLevel = 'base' | 'composed' | 'complex'

export type TokenCategory = 'structural' | 'visual'

export type TokenInfo = {
  name: string
  category: TokenCategory
}

export type PropInfo = {
  name: string
  type: string
  required: boolean
  isDesignToken: boolean
}

export type ComponentEntry = {
  name: string
  level: ComponentLevel
  tokens: TokenInfo[]
  props: PropInfo[]
  children: string[]
  description: string
  sourcePath: string
}

/** Extract token names from TokenInfo array */
export function getTokenNames(tokens: TokenInfo[]): string[] {
  return tokens.map(t => t.name)
}

/** Get structural tokens only */
export function getStructuralTokens(tokens: TokenInfo[]): TokenInfo[] {
  return tokens.filter(t => t.category === 'structural')
}

/** Get visual tokens only */
export function getVisualTokens(tokens: TokenInfo[]): TokenInfo[] {
  return tokens.filter(t => t.category === 'visual')
}

export const componentRegistry: Record<string, ComponentEntry> = {
  // ─── Base (${baseEntries.length} components) ──────────────────────────
${baseEntries.map(formatEntry).join(',\n')},

  // ─── Composed (${composedEntries.length} components) ────────────────────
${composedEntries.map(formatEntry).join(',\n')},

  // ─── Complex (${complexEntries.length} components) ──────────────────────
${complexEntries.map(formatEntry).join(',\n')},
}

/** Get all entries for a given level */
export function getComponentsByLevel(level: ComponentLevel): ComponentEntry[] {
  return Object.values(componentRegistry).filter(entry => entry.level === level)
}

/** Get a single entry by name */
export function getComponent(name: string): ComponentEntry | undefined {
  return componentRegistry[name]
}

/** Predefined chains for quick exploration */
export const popularChains = [
${chainsStr},
]
`
}

// ─── Run ────────────────────────────────────────────────────

main()
