/**
 * @ezstart/ai-sdk - Client exports
 * For use in React applications
 */
'use client'

// Provider
export { AIProvider, useAIContext } from './provider.js'

// Components
export { AISelector } from './client/components/AISelector.js'
export { AILayout } from './client/components/AILayout.js'
export type {
  AILayoutProps,
  AILayoutTexts,
  AILayoutSlots,
} from './client/components/ai-layout-types.js'
export { AIAdminDashboard } from './components/AIAdminDashboard.js'
export type { AIAdminDashboardTexts } from './components/AIAdminDashboard.js'
export type {
  AppProvider as AppProviderData,
  UpdateAppProviderRequest as AppProviderUpdateRequest,
} from './ai-types.js'

// Hooks
export { useAIChat } from './client/hooks/useAIChat.js'
export { useAIChatStream } from './client/hooks/useAIChatStream.js'
export type {
  UseAIChatStreamConfig,
  UseAIChatStreamReturn,
  AIChatStreamEvent,
} from './client/hooks/useAIChatStream.js'
export { useAIThread } from './client/hooks/useAIThread.js'
export type { UseAIThreadConfig, UseAIThreadReturn } from './client/hooks/useAIThread.js'
export { useProviders } from './client/hooks/useProviders.js'
export { useConversations, useConversation } from './client/hooks/useConversations.js'
export { usePrompts } from './client/hooks/usePrompts.js'
export { useAppProviders, useChatProviders } from './client/hooks/useAppProviders.js'

// Store
export { useAIStore } from './client/store/aiStore.js'
