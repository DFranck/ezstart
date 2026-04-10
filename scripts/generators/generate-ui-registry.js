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

const MAIN_INDEX = path.join(UI_PKG, 'index.ts')

const VARIANTS_FILE = path.join(ROOT, 'packages/ui/src/lib/design-system/variants.ts')

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
        // If the resolved file is an index.ts (barrel file), recurse into it
        if (path.basename(sourcePath) === 'index.ts' || path.basename(sourcePath) === 'index.tsx') {
          const subEntries = parseIndexExports(sourcePath)
          for (const [name, subSourcePath] of subEntries) {
            if (!entries.has(name)) {
              entries.set(name, subSourcePath)
            }
          }
        } else {
          const names = extractExportedNames(sourcePath)
          for (const name of names) {
            if (isComponentName(name)) {
              entries.set(name, sourcePath)
            }
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
  // Skip known non-components (config exports, variant maps, internal providers, etc.)
  const nonComponents = ['INTENT_ARIA_MAP', 'DesignTokenProvider', 'DesignTokenCtx']
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
    if (afterEqual.match(/^((React\.)?(forwardRef|memo)|function|\(|create[A-Z]\w*\()/)) {
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
 * Parse string literal union values from a type string.
 * E.g., "'sm' | 'default' | 'lg'" → ['sm', 'default', 'lg']
 */
function parseStringUnionValues(type) {
  if (!type) return []
  const matches = type.match(/['"]([^'"]+)['"]/g)
  if (!matches) return []
  return matches.map(m => m.replace(/['"]/g, ''))
}

/**
 * Extract cva variant keys and their values from a component source file.
 * Tries to match the cva block to the specific component by looking
 * for a const named `{componentName}Variants` or `{lowercase}Variants`.
 * Returns Map<tokenName, string[]> where string[] are the possible values.
 */
function extractCvaTokens(filePath, componentName) {
  const content = readFile(filePath)
  if (!content) return new Map()

  const tokenValues = new Map()

  /**
   * Extract token names and their sub-keys from a variants brace block.
   * The block is the content inside variants: { ... }
   * Each top-level key is a token, and its sub-keys are the possible values.
   */
  function extractTokensAndValues(block) {
    // Walk through at depth 0 to find top-level keys
    let i = 0
    let depth = 0

    while (i < block.length) {
      if (block[i] === '{') {
        depth++
        i++
        continue
      }
      if (block[i] === '}') {
        depth--
        i++
        continue
      }

      if (depth === 0) {
        const keyMatch = block.substring(i).match(/^(\w+)\s*:\s*\{/)
        if (keyMatch) {
          const tokenName = keyMatch[1]
          const subBlockStart = i + keyMatch[0].length
          const subBlock = extractBraceBlock(block, subBlockStart)
          if (subBlock) {
            if (!['true', 'false'].includes(tokenName)) {
              const values = extractTopLevelKeys(subBlock)
              tokenValues.set(tokenName, values)
            }
            // Skip past the entire sub-block
            i = subBlockStart + subBlock.length + 1
          } else {
            i += keyMatch[0].length
          }
          continue
        }
      }

      i++
    }
  }

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
      extractTokensAndValues(block)
      return tokenValues
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
          extractTokensAndValues(block)
        }
      }
    }
  }

  return tokenValues
}

/**
 * Extract ReactNode composition slots from a component's props.
 * Detects props whose type contains ReactNode, React.ReactNode, ReactElement, or JSX.Element.
 * Returns array of SlotInfo objects.
 */
function extractSlots(filePath, componentName) {
  const content = readFile(filePath)
  if (!content) return []

  const slots = []

  // Find the props type/interface block (same logic as extractProps)
  const propsPatterns = [
    new RegExp(`(?:type|interface)\\s+${componentName}Props[^{]*\\{`, 's'),
    /(?:type|interface)\s+(\w+Props)[^{]*\{/s,
  ]

  let propsBlock = null

  for (const pattern of propsPatterns) {
    const regex = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
    )
    regex.lastIndex = 0
    const match = regex.exec(content)
    if (match) {
      const startIdx = match.index + match[0].length
      propsBlock = extractBraceBlock(content, startIdx)
      if (propsBlock) break
    }
  }

  // Also check inline type in function signature
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

  // First pass: collect @slot annotations from JSDoc comments
  // Pattern: /** @slot ComponentA, ComponentB */ followed by propName
  const slotAnnotations = new Map()
  const jsdocSlotRegex = /\/\*\*\s*@slot\s+([^*]+?)\s*\*\/\s*\n?\s*(\w+)/g
  let jsdocMatch
  while ((jsdocMatch = jsdocSlotRegex.exec(propsBlock)) !== null) {
    const components = jsdocMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const propName = jsdocMatch[2]
    slotAnnotations.set(propName, components)
  }

  // Also handle single-line: /** @slot ComponentA */ propName?: ReactNode
  const inlineSlotRegex = /\/\*\*\s*@slot\s+([^*]+?)\s*\*\/\s*(\w+)/g
  while ((jsdocMatch = inlineSlotRegex.exec(propsBlock)) !== null) {
    const components = jsdocMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const propName = jsdocMatch[2]
    if (!slotAnnotations.has(propName)) {
      slotAnnotations.set(propName, components)
    }
  }

  // Match props whose type contains ReactNode, React.ReactNode, ReactElement, or JSX.Element
  const slotRegex = /^\s*(\w+)(\??)\s*:\s*([^\n]+)/gm
  let match
  const seen = new Set()

  while ((match = slotRegex.exec(propsBlock)) !== null) {
    const [, name, optional, rawType] = match

    if (seen.has(name)) continue
    seen.add(name)

    // Skip non-prop lines
    if (!name || /^[*\/]/.test(name)) continue

    // Clean up the type
    const type = rawType
      .trim()
      .replace(/\/\/.*$/, '')
      .replace(/,\s*$/, '')
      .replace(/;\s*$/, '')
      .trim()

    // Check if type contains ReactNode/ReactElement/JSX.Element
    const isReactNodeType = /React(?:\.)?Node|ReactElement|JSX\.Element/.test(type)
    if (!isReactNodeType) continue

    // Skip className, style, ref, key (already excluded but just in case)
    if (['className', 'style', 'ref', 'key'].includes(name)) continue

    // Determine if this is a render prop (function returning ReactNode) vs a composition slot
    const isRenderProp = name.startsWith('render') || /^\(.*\)\s*=>\s*/.test(type)

    // Get expected components from @slot annotation (empty array if none)
    const expectedComponents = slotAnnotations.get(name) || []

    slots.push({
      name,
      required: optional !== '?',
      isRenderProp,
      expectedComponents,
    })
  }

  return slots
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

// ─── Variants.ts Scanning ──────────────────────────────────

/**
 * Mapping from VariantConfig export name → component name(s).
 * When a config maps to multiple components, provide an array.
 */
const CONFIG_TO_COMPONENT = {
  buttonVariantConfig: 'Button',
  cardVariantConfig: 'Card',
  cardHeaderVariantConfig: 'CardHeader',
  cardContentVariantConfig: 'CardContent',
  dialogVariantConfig: 'Dialog',
  badgeVariantConfig: 'Badge',
  tableVariantConfig: 'Table',
  switchVariantConfig: 'Switch',
  switchThumbVariantConfig: 'SwitchThumb',
  skeletonVariantConfig: 'Skeleton',
  animatedCounterVariantConfig: 'AnimatedCounter',
  stepperVariantConfig: 'Stepper',
  commandGroupVariantConfig: 'CommandGroup',
  spinnerVariantConfig: 'Spinner',
  tooltipVariantConfig: 'Tooltip',
  alertDialogVariantConfig: 'AlertDialog',
  versionSwitchVariantConfig: 'VersionSwitch',
  heroVariantConfig: 'Hero',
  splitSectionVariantConfig: 'SplitSection',
  floatingPanelVariantConfig: 'FloatingPanel',
  textGradientVariantConfig: 'TextGradient',
  ctaVariantConfig: 'CTA',
  landingHeroVariantConfig: 'LandingHero',
  statsVariantConfig: 'Stats',
  featureGridVariantConfig: 'FeatureGrid',
  formInputVariantConfig: ['Input', 'Select', 'Textarea'],
}

/**
 * Mapping from tagVariantsMeta key (lowercase tag) → component name.
 * Tags from aliases.tsx use createAlias(tagName).
 */
const TAG_TO_COMPONENT = {
  div: 'Div',
  section: 'Section',
  aside: 'Aside',
  main: 'Main',
  nav: 'Nav',
  header: 'Header',
  footer: 'FooterTag',
  span: 'Span',
  p: 'P',
  h1: 'H1',
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
  h5: 'H5',
  h6: 'H6',
  ul: 'UL',
  li: 'LI',
  article: 'Article',
  strong: 'Strong',
  ol: 'Ol',
}

/**
 * Extract token names and their possible values from variants.ts by parsing VariantConfig objects
 * and tagVariantsMeta entries. Returns Map<componentName, Map<tokenName, string[]>>.
 */
function extractTokensFromVariantsFile() {
  const content = readFile(VARIANTS_FILE)
  if (!content) {
    console.warn('  WARNING: Could not read variants.ts')
    return new Map()
  }

  const componentTokens = new Map() // componentName → Map<tokenName, string[]>

  /**
   * Extract token keys and their sub-key values from a VariantConfig block.
   * Returns Map<tokenName, string[]>
   */
  function extractTokenValuesFromConfig(configBlock) {
    const tokenValues = new Map()
    let i = 0
    let depth = 0

    while (i < configBlock.length) {
      if (configBlock[i] === '{') {
        depth++
        i++
        continue
      }
      if (configBlock[i] === '}') {
        depth--
        i++
        continue
      }

      if (depth === 0) {
        // Handle spread: ...someVar
        const spreadMatch = configBlock.substring(i).match(/^\.\.\.(\w+)/)
        if (spreadMatch) {
          // Resolve spread target values
          const spreadTarget = spreadMatch[1]
          const targetRegex = new RegExp(`(?:export\\s+)?const\\s+${spreadTarget}\\s*=\\s*\\{`, 's')
          const targetMatch = targetRegex.exec(content)
          if (targetMatch) {
            const targetBlock = extractBraceBlock(
              content,
              targetMatch.index + targetMatch[0].length
            )
            if (targetBlock) {
              const spreadValues = extractTokenValuesFromConfig(targetBlock)
              for (const [k, v] of spreadValues) {
                if (!tokenValues.has(k)) {
                  tokenValues.set(k, v)
                } else {
                  // Merge values
                  const existing = new Set(tokenValues.get(k))
                  for (const val of v) existing.add(val)
                  tokenValues.set(k, [...existing])
                }
              }
            }
          }
          i += spreadMatch[0].length
          continue
        }

        const keyMatch = configBlock.substring(i).match(/^(\w+)\s*:\s*\{/)
        if (keyMatch) {
          const tokenName = keyMatch[1]
          const subBlockStart = i + keyMatch[0].length
          const subBlock = extractBraceBlock(configBlock, subBlockStart)
          if (subBlock) {
            if (!['true', 'false', 'as'].includes(tokenName)) {
              const values = extractTopLevelKeys(subBlock)
              tokenValues.set(tokenName, values)
            }
            // Skip past the entire sub-block (subBlock length + closing brace)
            i = subBlockStart + subBlock.length + 1
          } else {
            i += keyMatch[0].length
          }
          continue
        }
      }

      i++
    }

    return tokenValues
  }

  // --- Part A: Parse named VariantConfig objects ---
  // Pattern: export const xxxVariantConfig = { key1: {...}, key2: {...}, ... }
  for (const [configName, componentNames] of Object.entries(CONFIG_TO_COMPONENT)) {
    const configRegex = new RegExp(`export\\s+const\\s+${configName}\\s*=\\s*\\{`, 's')
    const match = configRegex.exec(content)
    if (!match) continue

    const block = extractBraceBlock(content, match.index + match[0].length)
    if (!block) continue

    const tokenValuesMap = extractTokenValuesFromConfig(block)

    // Map to component(s)
    const targets = Array.isArray(componentNames) ? componentNames : [componentNames]
    for (const comp of targets) {
      if (!componentTokens.has(comp)) componentTokens.set(comp, new Map())
      const compMap = componentTokens.get(comp)
      for (const [tokenName, values] of tokenValuesMap) {
        if (!compMap.has(tokenName)) {
          compMap.set(tokenName, values)
        } else {
          // Merge values
          const existing = new Set(compMap.get(tokenName))
          for (const v of values) existing.add(v)
          compMap.set(tokenName, [...existing])
        }
      }
    }
  }

  // --- Part B: Parse tagVariantsMeta for Tag aliases ---
  // The tagVariantsMeta object maps tag names → { variantKey: [...values] }
  // We extract the variant key names (e.g., variant, size, layout, density, intent)
  const metaRegex = /export\s+const\s+tagVariantsMeta[^=]*=\s*\{/s
  const metaMatch = metaRegex.exec(content)
  if (metaMatch) {
    const metaBlock = extractBraceBlock(content, metaMatch.index + metaMatch[0].length)
    if (metaBlock) {
      // For each tag entry, we need to figure out which variant keys it has.
      // The meta is built via extractMetaKeys(someConfig) or inline { variant: ..., size: ... }
      // Instead of eval, we trace back to the config used.
      // Strategy: for each tag in TAG_TO_COMPONENT, find its config.
      const tagConfigMap = buildTagConfigMap(content)

      for (const [tag, componentName] of Object.entries(TAG_TO_COMPONENT)) {
        const configName = tagConfigMap[tag]
        if (!configName) continue

        // If we already parsed this config in Part A, reuse it
        const configRegex2 = new RegExp(`export\\s+const\\s+${configName}\\s*=\\s*\\{`, 's')
        const configMatch = configRegex2.exec(content)
        if (!configMatch) continue

        const configBlock = extractBraceBlock(content, configMatch.index + configMatch[0].length)
        if (!configBlock) continue

        const tokenValuesMap = extractTokenValuesFromConfig(configBlock)

        if (!componentTokens.has(componentName)) componentTokens.set(componentName, new Map())
        const compMap = componentTokens.get(componentName)
        for (const [tokenName, values] of tokenValuesMap) {
          if (!compMap.has(tokenName)) {
            compMap.set(tokenName, values)
          } else {
            const existing = new Set(compMap.get(tokenName))
            for (const v of values) existing.add(v)
            compMap.set(tokenName, [...existing])
          }
        }
      }
    }
  }

  return componentTokens
}

/**
 * Build a map of tag name → VariantConfig name used by tagVariantsMeta.
 * Parses the tagVariantsMeta definition to find which config each tag uses.
 */
function buildTagConfigMap(content) {
  const map = {}

  // Pattern 1: tag: extractMetaKeys(someConfig),
  const extractMetaPattern = /(\w+)\s*:\s*extractMetaKeys\s*\(\s*(\w+)\s*\)/g
  // Only match within the tagVariantsMeta block
  const metaStart = content.indexOf('tagVariantsMeta')
  if (metaStart === -1) return map

  const metaSection = content.substring(metaStart, metaStart + 3000)
  let m
  while ((m = extractMetaPattern.exec(metaSection)) !== null) {
    map[m[1]] = m[2]
  }

  // Pattern 2: headings use tagHeadingVariantConfig (inline Object.keys)
  // h1: { variant: Object.keys(tagHeadingVariantConfig.variant), size: Object.keys(tagHeadingVariantConfig.size) }
  const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  for (const tag of headingTags) {
    if (!map[tag]) {
      map[tag] = 'tagHeadingVariantConfig'
    }
  }

  return map
}

/**
 * Extract top-level object keys from a brace block content.
 * Handles: key: { ... }, key: someVar, ...key (spread)
 * Skips boolean keys like 'true', 'false'.
 */
function extractTopLevelKeys(block) {
  const keys = []
  // We need to walk the block tracking brace depth to only get top-level keys
  let i = 0
  let depth = 0

  while (i < block.length) {
    // Skip string literals (single-quoted, double-quoted, backtick)
    if (block[i] === "'" || block[i] === '"' || block[i] === '`') {
      const quote = block[i]
      i++
      while (i < block.length && block[i] !== quote) {
        if (block[i] === '\\') i++ // skip escaped char
        i++
      }
      i++ // skip closing quote
      continue
    }

    // Skip line comments
    if (block[i] === '/' && block[i + 1] === '/') {
      while (i < block.length && block[i] !== '\n') i++
      continue
    }

    // Skip block comments
    if (block[i] === '/' && block[i + 1] === '*') {
      i += 2
      while (i < block.length - 1 && !(block[i] === '*' && block[i + 1] === '/')) i++
      i += 2
      continue
    }

    // Skip nested blocks
    if (block[i] === '{') {
      depth++
      i++
      continue
    }
    if (block[i] === '}') {
      depth--
      i++
      continue
    }

    // Skip array literals
    if (block[i] === '[') {
      let arrayDepth = 1
      i++
      while (i < block.length && arrayDepth > 0) {
        if (block[i] === '[') arrayDepth++
        else if (block[i] === ']') arrayDepth--
        else if (block[i] === "'" || block[i] === '"' || block[i] === '`') {
          const q = block[i]
          i++
          while (i < block.length && block[i] !== q) {
            if (block[i] === '\\') i++
            i++
          }
        }
        i++
      }
      continue
    }

    // Only extract keys at depth 0
    if (depth === 0) {
      // Handle spread: ...someVar
      const spreadMatch = block.substring(i).match(/^\.\.\.(\w+)/)
      if (spreadMatch) {
        // Spread operator — we'd need to resolve the spread target
        // For now, skip it (the spread's keys will be resolved via the spread target's config)
        i += spreadMatch[0].length
        continue
      }

      // Match key: (at top level) — must be preceded by start-of-line/whitespace/comma
      // to avoid matching Tailwind pseudo-classes like hover: inside strings
      const keyMatch = block.substring(i).match(/^(\w+)\s*:(?!:)/)
      if (keyMatch) {
        const key = keyMatch[1]
        if (!['true', 'false', 'as'].includes(key)) {
          keys.push(key)
        }
        i += keyMatch[0].length
        continue
      }
    }

    i++
  }

  return [...new Set(keys)]
}

/**
 * Resolve spread operators in a VariantConfig block.
 * Returns all keys including those from spread targets.
 */
function resolveSpreadKeys(content, block) {
  const keys = extractTopLevelKeys(block)

  // Find spread operators: ...someVar
  const spreadRegex = /\.\.\.(\w+)/g
  let m
  while ((m = spreadRegex.exec(block)) !== null) {
    const spreadTarget = m[1]
    // Find the spread target definition
    const targetRegex = new RegExp(`(?:export\\s+)?const\\s+${spreadTarget}\\s*=\\s*\\{`, 's')
    const targetMatch = targetRegex.exec(content)
    if (targetMatch) {
      const targetBlock = extractBraceBlock(content, targetMatch.index + targetMatch[0].length)
      if (targetBlock) {
        const spreadKeys = extractTopLevelKeys(targetBlock)
        keys.push(...spreadKeys)
      }
    }
  }

  return [...new Set(keys)]
}

// ─── Design Token Propagation Detection ────────────────────

/** Known token names that can be provided/inherited via DesignTokenProvider */
const KNOWN_CONTEXT_TOKENS = ['size', 'density', 'radius', 'intent', 'variant', 'colorScheme']

/**
 * Detect which design tokens a component provides via DesignTokenProvider.
 * Scans for <DesignTokenProvider prop1={...} prop2={...}> and extracts prop names.
 * Returns string[] of token names this component provides.
 */
function extractProvidedTokens(filePath) {
  const content = readFile(filePath)
  if (!content) return []

  // Check if file uses DesignTokenProvider at all
  if (!content.includes('DesignTokenProvider')) return []

  const provided = new Set()

  // Match <DesignTokenProvider followed by props until >
  // We extract all prop names that match known tokens
  const providerRegex = /<DesignTokenProvider\s+([^>]+)>/g
  let match
  while ((match = providerRegex.exec(content)) !== null) {
    const propsStr = match[1]
    // Extract prop names: word followed by = or just word (shorthand)
    for (const token of KNOWN_CONTEXT_TOKENS) {
      // Match token={...} or token (shorthand boolean)
      const tokenRegex = new RegExp(`\\b${token}(?:\\s*=|\\s*[/}>])`)
      if (tokenRegex.test(propsStr)) {
        provided.add(token)
      }
    }
  }

  return [...provided]
}

/**
 * Detect which design tokens a component inherits (reads) via useDesignTokens().
 * Scans for useDesignTokens() usage, then finds property accesses like .size, .density, etc.
 * Returns string[] of token names this component reads from context.
 */
function extractInheritedTokens(filePath) {
  const content = readFile(filePath)
  if (!content) return []

  // Check if file uses useDesignTokens at all
  if (!content.includes('useDesignTokens')) return []

  const inherited = new Set()

  // Look for property accesses on known token names anywhere in the file
  // after useDesignTokens() is called. Patterns:
  //   inherited.size, tokens.density, ctx.radius, etc.
  //   Also: .intent (after variable name)
  for (const token of KNOWN_CONTEXT_TOKENS) {
    // Match: variableName.token where variableName could be anything
    // We look for .token preceded by a word character (the variable name)
    const accessRegex = new RegExp(`\\w+\\.${token}\\b`)
    if (accessRegex.test(content)) {
      // Make sure it's not just an import or type definition
      // by checking it appears after useDesignTokens
      const useIdx = content.indexOf('useDesignTokens')
      const accessMatch = content.substring(useIdx).match(accessRegex)
      if (accessMatch) {
        inherited.add(token)
      }
    }
  }

  return [...inherited]
}

// ─── Compound Component Detection ──────────────────────────

/**
 * Detect compound component groups: multiple exports from the same source file
 * sharing a common prefix. E.g., Card, CardHeader, CardContent from card.tsx.
 *
 * Returns array of { root: string, children: string[] }
 */
function detectCompoundGroups(registry) {
  // Group components by their source file
  const bySourceFile = new Map() // sourcePath → [componentName, ...]
  for (const [name, entry] of Object.entries(registry)) {
    const src = entry.sourcePath
    if (!bySourceFile.has(src)) bySourceFile.set(src, [])
    bySourceFile.get(src).push(name)
  }

  const groups = []

  for (const [, names] of bySourceFile) {
    if (names.length < 2) continue

    // Find potential compound roots: a name that is a prefix of other names in the same file.
    // The suffix after the prefix must start with an uppercase letter (word boundary).
    // E.g., Card is a prefix of CardHeader (suffix "Header" starts uppercase) ✅
    //        Tab is NOT a valid root if both Table and Tabs exist (they are separate roots)

    // Sort names shortest-first so we try shorter prefixes first
    const sorted = [...names].sort((a, b) => a.length - b.length)

    const claimed = new Set() // names already assigned as children

    for (const candidate of sorted) {
      if (claimed.has(candidate)) continue

      const children = []
      for (const other of names) {
        if (other === candidate) continue
        if (claimed.has(other)) continue

        // Check: other starts with candidate AND the next char is uppercase
        if (
          other.length > candidate.length &&
          other.startsWith(candidate) &&
          /^[A-Z]/.test(other.charAt(candidate.length))
        ) {
          children.push(other)
        }
      }

      if (children.length >= 1) {
        // Mark children as claimed so they don't become roots of other groups
        for (const child of children) {
          claimed.add(child)
        }
        groups.push({ root: candidate, children: children.sort() })
      }
    }
  }

  return groups
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  console.log('Design System Inspector — Registry Generator')
  console.log('=============================================\n')

  // Step 1: Scan the main components index.ts (source of truth)
  console.log('Scanning main components index.ts...')
  const mainEntries = parseIndexExports(MAIN_INDEX)
  const allComponentNames = new Set(mainEntries.keys())
  console.log(`  Found ${allComponentNames.size} components.\n`)

  // Step 2: For each component, extract props, tokens, children, and auto-determine level
  const registry = {}
  let processed = 0
  let skipped = 0

  for (const [name, sourcePath] of mainEntries) {
    try {
      // Extract props
      const props = extractProps(sourcePath, name)

      // Extract tokens from cva variants (Map<tokenName, string[]>)
      const cvaTokenMap = extractCvaTokens(sourcePath, name)

      // Build token values map: tokenName → string[] (values)
      const tokenValuesMap = new Map(cvaTokenMap)

      // Merge: tokens from cva + props that are design tokens
      const tokenSet = new Set(cvaTokenMap.keys())
      for (const prop of props) {
        if (prop.isDesignToken) {
          tokenSet.add(prop.name)
          // If prop has string union type, extract values
          if (!tokenValuesMap.has(prop.name) && isStringUnionType(prop.type)) {
            tokenValuesMap.set(prop.name, parseStringUnionValues(prop.type))
          } else if (tokenValuesMap.has(prop.name) && isStringUnionType(prop.type)) {
            // Merge prop type values with existing cva values
            const existing = new Set(tokenValuesMap.get(prop.name))
            for (const v of parseStringUnionValues(prop.type)) existing.add(v)
            tokenValuesMap.set(prop.name, [...existing])
          }
        }
      }
      const tokens = [...tokenSet]

      // Extract children (other UI components imported by this component)
      const children = extractChildren(sourcePath, allComponentNames)

      // Extract composition slots
      const slots = extractSlots(sourcePath, name)

      // Extract design token propagation info
      const providesTokens = extractProvidedTokens(sourcePath)
      const inheritsTokens = extractInheritedTokens(sourcePath)

      // Auto-determine level:
      //   complex  = imports other UI components AND has ReactNode slots
      //   composed = imports other UI components (no slots required)
      //   base     = everything else
      let level = 'base'
      if (children.length > 0 && slots.length > 0) {
        level = 'complex'
      } else if (children.length > 0) {
        level = 'composed'
      }

      // Generate description
      const description = generateDescription(name, level, tokens, children)

      registry[name] = {
        name,
        level,
        tokens,
        tokenValuesMap,
        props,
        children,
        slots,
        providesTokens,
        inheritsTokens,
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

  // Step 2b: Merge tokens from variants.ts (source of truth for design tokens)
  console.log('\nScanning variants.ts for centralized design tokens...')
  const variantsTokens = extractTokensFromVariantsFile()
  let mergedCount = 0

  for (const [componentName, variantTokenValuesMap] of variantsTokens) {
    const entry = registry[componentName]
    if (!entry) continue

    const existingTokenNames = new Set(entry.tokens.map(t => (typeof t === 'string' ? t : t)))
    let added = 0
    for (const [tokenName, values] of variantTokenValuesMap) {
      if (!existingTokenNames.has(tokenName)) {
        entry.tokens.push(tokenName)
        existingTokenNames.add(tokenName)
        added++
      }
      // Always merge values (variants.ts is the priority source)
      if (values && values.length > 0) {
        const existing = entry.tokenValuesMap.has(tokenName)
          ? new Set(entry.tokenValuesMap.get(tokenName))
          : new Set()
        for (const v of values) existing.add(v)
        entry.tokenValuesMap.set(tokenName, [...existing])
      }
    }
    if (added > 0) {
      // Regenerate description with updated tokens
      entry.description = generateDescription(entry.name, entry.level, entry.tokens, entry.children)
      mergedCount++
    }
  }

  console.log(`  Found tokens for ${variantsTokens.size} components in variants.ts`)
  console.log(`  Merged new tokens into ${mergedCount} registry entries`)

  // Step 2c: Detect compound components (multiple exports from the same source file sharing a prefix)
  console.log('\nDetecting compound component groups...')
  const compoundGroups = detectCompoundGroups(registry)
  let compoundCount = 0

  for (const { root, children } of compoundGroups) {
    const entry = registry[root]
    if (!entry) continue

    // Upgrade root level to "composed" unless it's already "complex"
    if (entry.level === 'base') {
      entry.level = 'composed'
    }

    // Populate children array (merge with any existing children from import-based detection)
    const existingChildren = new Set(entry.children)
    for (const child of children) {
      existingChildren.add(child)
    }
    entry.children = [...existingChildren]

    // Regenerate description with updated level and children
    entry.description = generateDescription(entry.name, entry.level, entry.tokens, entry.children)

    compoundCount++
    console.log(`  ${root} → [${children.join(', ')}]`)
  }

  console.log(`  Detected ${compoundCount} compound component groups`)

  // Step 2d: Clean up provides/inherits for compound groups (file-level scan bleed)
  // Card.tsx has DesignTokenProvider (in Card) and useDesignTokens (in CardHeader etc.)
  // File-level scan wrongly attributes both to all exports. Fix:
  // - Root that provides: clear its inheritsTokens (children inherit, not the root)
  // - Children that don't provide: clear their providesTokens (root provides, not children)
  for (const { root, children } of compoundGroups) {
    const rootEntry = registry[root]
    if (!rootEntry) continue

    // Root is provider → doesn't inherit (that's from children in same file)
    if (rootEntry.providesTokens.length > 0 && rootEntry.inheritsTokens.length > 0) {
      console.log(`  Cleaned inheritsTokens from provider root: ${root}`)
      rootEntry.inheritsTokens = []
    }

    // Children don't provide (that's from root in same file)
    for (const childName of children) {
      const childEntry = registry[childName]
      if (!childEntry) continue
      if (childEntry.providesTokens.length > 0 && rootEntry.providesTokens.length > 0) {
        console.log(`  Cleaned providesTokens from compound child: ${childName}`)
        childEntry.providesTokens = []
      }
    }
  }

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

  function formatSlots(slots) {
    if (slots.length === 0) return '[]'
    const items = slots.map(s => {
      const expected =
        s.expectedComponents.length > 0
          ? `[${s.expectedComponents.map(c => `'${c}'`).join(', ')}]`
          : '[]'
      return `      { name: '${s.name}', required: ${s.required}, isRenderProp: ${s.isRenderProp}, expectedComponents: ${expected} }`
    })
    return `[\n${items.join(',\n')},\n    ]`
  }

  function formatEntry([name, entry]) {
    const tokens =
      entry.tokens.length > 0
        ? `[${entry.tokens
            .map(t => {
              const values = entry.tokenValuesMap && entry.tokenValuesMap.get(t)
              const valuesStr =
                values && values.length > 0
                  ? `, values: [${values.map(v => `'${v}'`).join(', ')}]`
                  : ''
              return `{ name: '${t}', category: '${categorizeToken(t)}'${valuesStr} }`
            })
            .join(', ')}]`
        : '[]'
    const children =
      entry.children.length > 0 ? `[${entry.children.map(c => `'${c}'`).join(', ')}]` : '[]'
    const props = formatProps(entry.props)
    const slots = formatSlots(entry.slots)
    const providesTokens =
      entry.providesTokens && entry.providesTokens.length > 0
        ? `[${entry.providesTokens.map(t => `'${t}'`).join(', ')}]`
        : '[]'
    const inheritsTokens =
      entry.inheritsTokens && entry.inheritsTokens.length > 0
        ? `[${entry.inheritsTokens.map(t => `'${t}'`).join(', ')}]`
        : '[]'

    return `  ${name}: {
    name: '${name}',
    level: '${entry.level}',
    tokens: ${tokens},
    props: ${props},
    children: ${children},
    slots: ${slots},
    providesTokens: ${providesTokens},
    inheritsTokens: ${inheritsTokens},
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
  values?: string[]
}

export type PropInfo = {
  name: string
  type: string
  required: boolean
  isDesignToken: boolean
}

export type SlotInfo = {
  name: string
  required: boolean
  isRenderProp: boolean
  expectedComponents: string[]
}

export type ComponentEntry = {
  name: string
  level: ComponentLevel
  tokens: TokenInfo[]
  props: PropInfo[]
  children: string[]
  slots: SlotInfo[]
  providesTokens: string[]
  inheritsTokens: string[]
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
