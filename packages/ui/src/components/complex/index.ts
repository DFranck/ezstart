// Complex level — components using 4+ other UI components

// Landing
export { FeatureGrid } from '../landing/feature-grid.js'
export type { FeatureGridProps, Feature } from '../landing/feature-grid.js'
export { Hero as LandingHero } from '../landing/landing-hero.js'
export type { HeroProps as LandingHeroProps } from '../landing/landing-hero.js'
export { UseCases } from '../landing/use-cases.js'
export type { UseCasesProps, UseCase } from '../landing/use-cases.js'

// Layout
export { ClientLayout } from '../layout/client-layout.js'
export type { ClientLayoutProps } from '../layout/client-layout.js'
export { LayoutWithAside } from '../layout/layout-with-aside.js'

// Navigation
export { Stepper, StepContent, StepSummary, useStepper } from '../navigation/stepper.js'
export type { Step, StepButton, StepperButtons, StepperTheme } from '../navigation/stepper.js'

// Theme Selector
export { ThemeEditor, ThemeSelector, ColorVariableEditor } from '../theme-selector/index.js'
export type {
  ColorFormat,
  ThemeVariableCategory,
  ThemeVariable,
  ThemeConfig,
  ThemeOverrides,
  ThemeEditorProps,
  ThemeSelectorProps,
  UseThemeOptions,
  UseThemeEditorOptions,
  ThemeHistoryEntry,
} from '../theme-selector/types.js'
export type {
  OklchColor,
  HexColor,
  CssVariableName,
  ThemeApiResponse,
  ThemeApiRequest,
} from '../theme-selector/schemas/theme.schema.js'
export * from '../theme-selector/hooks/index.js'
export * from '../theme-selector/utils/index.js'

// Thread
export { ThreadLayout } from '../thread/ThreadLayout.js'
export { ThreadSidebar } from '../thread/ThreadSidebar.js'
export type { Conversation } from '../thread/ThreadSidebar.js'

// Utility
export { ErrorBoundary } from '../utility/error-boundary.js'
export type { ErrorBoundaryProps } from '../utility/error-boundary.js'
