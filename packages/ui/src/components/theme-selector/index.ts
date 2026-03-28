// Main exports
export { ThemeEditor } from './theme-editor'
export { ColorVariableEditor } from './components/color-variable-editor'

// Legacy export for backward compatibility
export { ThemeEditor as ThemeSelector } from './theme-editor'

export * from './types'
export * from './hooks'
export * from './utils'

// Re-export only types from schemas to avoid conflicts
export type {
  OklchColor,
  HexColor,
  CssVariableName,
  ThemeApiResponse,
  ThemeApiRequest,
} from './schemas/theme.schema'
