'use client'

import type { ReactNode } from 'react'
import type { AppName } from '@ezstart/config/urls'

export type AILayoutTexts = {
  welcomeTitle?: string
  welcomeDescription?: string
  composerPlaceholder?: string
  loadingText?: string
  newChatLabel?: string
  sidebarEmptyState?: string
  loginPrompt?: string
  sendLabel?: string
  /** Title shown when no AI provider is configured */
  noProvidersTitle?: string
  /** Description shown when no AI provider is configured */
  noProvidersDescription?: string
  /** CTA label (admin only) linking to provider admin page */
  noProvidersCTA?: string
  /** Composer placeholder when providers are not configured */
  noProvidersComposerPlaceholder?: string
}

export type AILayoutSlots = {
  sidebarHeader?: ReactNode
  sidebarFooter?: ReactNode
  sidebarBeforeConversations?: ReactNode
  sidebarAfterConversations?: ReactNode
  welcomeContent?: ReactNode
  welcomeExtra?: ReactNode
  threadHeader?: ReactNode
}

export type AILayoutProps = {
  appName: AppName
  locale?: string
  texts?: AILayoutTexts
  slots?: AILayoutSlots
  extraPayload?: Record<string, unknown>
  showProviderSelector?: boolean
  showSidebar?: boolean
  onError?: (error: Error) => void
  onConversationCreated?: (id: string) => void
  getToken?: () => string | null
  className?: string
  /** Container height: 'viewport' (full page), 'fill' (parent), or custom Tailwind class */
  height?: 'viewport' | 'fill' | (string & {})
  headerOffset?: string
  mobileHeaderOffset?: string
  mobileFooterOffset?: string
  formatResponseTime?: (ms: number) => string
  /** Show × close button inside the sidebar Sheet. Default: false (use burger/overlay to close) */
  showSidebarCloseButton?: boolean
}
