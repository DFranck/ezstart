// Providers modulaires (NOUVEAU - recommandé)
export { IntlProvider } from './providers/intl-provider.js'
export type { IntlProviderProps } from './providers/intl-provider.js'

export { ThemeProvider } from './providers/theme-provider.js'
export type { ThemeProviderProps } from './providers/theme-provider.js'

export { AllProviders } from './providers/all-providers.js'
export type { AllProvidersProps } from './providers/all-providers.js'

// Providers legacy (à migrer)
export { WebProviders, SimpleWebProviders } from './providers.js'
export type { WebProvidersProps } from './providers.js'

// Middleware
export { createIntlMiddleware } from './middleware.js'