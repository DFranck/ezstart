/**
 * Application management components (P6 — multi-tenant entity).
 *
 * Peer dependencies: `react`, `@ezstart/ui`, `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

export { ApplicationsList } from './ApplicationsList.js'
export type { ApplicationsListProps } from './ApplicationsList.js'

export { ApplicationCard } from './ApplicationCard.js'
export type { ApplicationCardProps } from './ApplicationCard.js'

export { CreateApplicationModal } from './CreateApplicationModal.js'
export type { CreateApplicationModalProps } from './CreateApplicationModal.js'

export { ApplicationDetailView } from './ApplicationDetailView.js'
export type { ApplicationDetailViewProps } from './ApplicationDetailView.js'

export { ApplicationThemeEditor } from './ApplicationThemeEditor.js'
export type { ApplicationThemeEditorProps } from './ApplicationThemeEditor.js'

export { WebhookSecretSection } from './WebhookSecretSection.js'
export type { WebhookSecretSectionProps } from './WebhookSecretSection.js'

// Texts types & defaults
export type {
  ApplicationsListTexts,
  ApplicationCardTexts,
  CreateApplicationModalTexts,
  ApplicationDetailViewTexts,
  ApplicationsFlowTexts,
} from './types.js'
export { defaultApplicationsFlowTexts } from './types.js'
