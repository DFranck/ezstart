'use client'

import type { ReactNode } from 'react'
import type { ColorScheme, ThreadTheme } from '@ezstart/ui/components'
import type { AppName } from '@ezstart/config/urls'

export type AILayoutTexts = {
  welcomeTitle?: string
  welcomeDescription?: string
  composerPlaceholder?: string
  loadingText?: string
  newChatLabel?: string
  sidebarEmptyState?: string
  sendLabel?: string
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
  colorScheme?: ColorScheme
  customTheme?: Partial<ThreadTheme>
  texts?: AILayoutTexts
  slots?: AILayoutSlots
  extraPayload?: Record<string, unknown>
  showProviderSelector?: boolean
  showSidebar?: boolean
  onError?: (error: Error) => void
  onConversationCreated?: (id: string) => void
  getToken?: () => string | null
  className?: string
  headerOffset?: string
  mobileHeaderOffset?: string
  mobileFooterOffset?: string
  formatResponseTime?: (ms: number) => string
}
