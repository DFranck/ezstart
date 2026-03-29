import { logger } from '@ezstart/logger'
import type { ThemeVariable, ThemeVariableCategory } from '../types'

/**
 * Parse CSS content to extract CSS variables
 * This is a simple regex-based parser for CSS custom properties
 */
export function parseThemeCSS(cssContent: string): ThemeVariable[] {
  const variables: ThemeVariable[] = []

  // Match CSS variable declarations: --variable-name: value;
  const variableRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi
  const commentRegex = /\/\*\s*(.+?)\s*\*\//

  const lines = cssContent.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    const match = variableRegex.exec(line)

    if (match && match[1] && match[2]) {
      const name = match[1]
      const rawValue = match[2]
      const fullName = `--${name}`
      const value = rawValue.trim()

      // Try to extract comment from previous line or same line
      let description: string | undefined

      // Check previous line for comment
      const prevLine = i > 0 ? lines[i - 1] : undefined
      if (prevLine) {
        const commentMatch = commentRegex.exec(prevLine)
        if (commentMatch && commentMatch[1]) {
          description = commentMatch[1].trim()
        }
      }

      // Check inline comment
      const inlineCommentMatch = /\/\*\s*(.+?)\s*\*\//.exec(line)
      if (inlineCommentMatch && inlineCommentMatch[1]) {
        description = inlineCommentMatch[1].trim()
      }

      variables.push({
        name: fullName,
        value,
        category: inferCategory(fullName),
        description,
      })
    }

    // Reset regex for next iteration
    variableRegex.lastIndex = 0
  }

  return variables
}

/**
 * Infer category from variable name
 */
function inferCategory(varName: string): ThemeVariableCategory {
  const name = varName.toLowerCase()

  if (name.includes('primary')) return 'primary'
  if (name.includes('secondary')) return 'secondary'
  if (name.includes('accent')) return 'accent'
  if (
    name.includes('status') ||
    name.includes('success') ||
    name.includes('error') ||
    name.includes('warning')
  ) {
    return 'status'
  }
  if (
    name.includes('platform') ||
    name.includes('railway') ||
    name.includes('vercel') ||
    name.includes('render')
  ) {
    return 'platform'
  }

  return 'custom'
}

/**
 * Convert parsed variables to ThemeConfig format
 */
export function variablesToThemeConfig(variables: ThemeVariable[], appName: string) {
  return {
    variables,
    metadata: {
      appName,
      version: '1.0.0',
    },
  }
}

/**
 * Extract content between balanced braces for a CSS selector
 */
function extractBlockContent(cssContent: string, selector: string): string | null {
  const selectorRegex = new RegExp(`${selector}\\s*\\{`, 'i')
  const match = selectorRegex.exec(cssContent)

  if (!match) return null

  let startIndex = match.index + match[0].length
  let braceCount = 1
  let endIndex = startIndex

  // Find matching closing brace
  for (let i = startIndex; i < cssContent.length; i++) {
    if (cssContent[i] === '{') braceCount++
    if (cssContent[i] === '}') braceCount--

    if (braceCount === 0) {
      endIndex = i
      break
    }
  }

  if (braceCount !== 0) return null

  return cssContent.substring(startIndex, endIndex)
}

/**
 * Extract CSS variables from :root selector
 */
export function extractRootVariables(cssContent: string): ThemeVariable[] {
  const rootBlock = extractBlockContent(cssContent, ':root')

  if (!rootBlock) {
    // Fallback: parse entire content
    logger.warn('No :root block found, parsing entire CSS content')
    return parseThemeCSS(cssContent)
  }

  return parseThemeCSS(rootBlock)
}

/**
 * Extract CSS variables from .dark selector
 */
export function extractDarkVariables(cssContent: string): ThemeVariable[] {
  const darkBlock = extractBlockContent(cssContent, '\\.dark')

  if (!darkBlock) {
    logger.warn('No .dark block found in CSS')
    return []
  }

  return parseThemeCSS(darkBlock)
}
