// Provider and context
export { PayProvider, usePay, usePayContext } from './pay-provider.js'

// Store
export { usePayStore, usePayStoreSSR } from './store.js'
export type { PayState } from './store.js'

// Hooks
export { useDonations } from './hooks/useDonations.js'
export { usePurchases } from './hooks/usePurchases.js'
export { useSubscriptions } from './hooks/useSubscriptions.js'
export { useSubscriptionStatus } from './hooks/useSubscriptionStatus.js'
export { usePaymentHistory } from './hooks/usePaymentHistory.js'
export { usePlans } from './hooks/usePlans.js'

// Connect hooks
export { useConnectStatus } from './hooks/useConnectStatus.js'
export { useConnectOnboard } from './hooks/useConnectOnboard.js'
export { useConnectDashboardLink } from './hooks/useConnectDashboardLink.js'
export { useConnectDisconnect } from './hooks/useConnectDisconnect.js'

// API Keys hooks (P6 — requires @tanstack/react-query peer dep)
export { usePayKeys, PAY_KEYS_QUERY_KEY, payKeysQueryKey } from './hooks/usePayKeys.js'
export type { UsePayKeysOptions } from './hooks/usePayKeys.js'
export { useCreatePayKey } from './hooks/useCreatePayKey.js'
export type { UseCreatePayKeyCallbacks } from './hooks/useCreatePayKey.js'
export { useRevokePayKey } from './hooks/useRevokePayKey.js'
export type { UseRevokePayKeyCallbacks } from './hooks/useRevokePayKey.js'
export { useRotatePayKey } from './hooks/useRotatePayKey.js'
export type { UseRotatePayKeyCallbacks } from './hooks/useRotatePayKey.js'
export { usePayKeyUsage, payKeyUsageQueryKey } from './hooks/usePayKeyUsage.js'
export type { UsePayKeyUsageOptions } from './hooks/usePayKeyUsage.js'
