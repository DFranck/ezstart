/**
 * EZPay developer portal components — API key management UI.
 *
 * Peer dependencies: `react`, `@ezstart/ui`, `@ezstart/auth-sdk`,
 * `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

export { PayDeveloperPortal } from './PayDeveloperPortal.js'
export type { PayDeveloperPortalProps } from './PayDeveloperPortal.js'

export { CreatePayKeyModal } from './CreatePayKeyModal.js'
export type { CreatePayKeyModalProps } from './CreatePayKeyModal.js'

// Texts types & defaults
export type {
  PayDeveloperPortalTexts,
  PayApiKeysTableTexts,
  CreatePayKeyModalTexts,
  KeyCreatedModalTexts,
} from './types.js'
export { defaultPayDeveloperPortalTexts } from './types.js'
