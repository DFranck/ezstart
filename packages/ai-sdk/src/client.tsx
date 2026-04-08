/**
 * @ezstart/ai-sdk - Client exports
 * For use in React applications
 */
'use client'

// Provider
export { AIProvider, useAIContext } from './provider.js'

// Components
export { AISelector } from './client/components/AISelector.js'
export { AIAdminDashboard } from './components/AIAdminDashboard.js'
export type { AIAdminDashboardTexts } from './components/AIAdminDashboard.js'

// Hooks
export { useAIChat } from './client/hooks/useAIChat.js'
export { useProviders } from './client/hooks/useProviders.js'
export { useConversations, useConversation } from './client/hooks/useConversations.js'
export { usePrompts } from './client/hooks/usePrompts.js'

// Store
export { useAIStore } from './client/store/aiStore.js'
