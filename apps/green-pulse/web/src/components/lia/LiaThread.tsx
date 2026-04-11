'use client'

import { greenPulseThreadTheme } from '@/config/thread-theme'
import { useConversations, useConversation } from '@ezstart/ai-sdk/client'
import type { AIProviderInfo } from '@ezstart/ai-sdk'
import { AISelector } from '@ezstart/ai-sdk/client'
import { useAuthStore, UserMenu } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { useRBAC } from '@ezstart/rbac'
import {
  Button,
  Conversation,
  Div,
  Icon,
  Nav,
  Span,
  Thread,
  ThreadComposer,
  ThreadHeader,
  ThreadLayout,
  ThreadMessages,
  ThreadSidebar,
  ThreadSidebarToggle,
  ThreadWelcome,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ezstart/ui/components'
import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useThreadContext } from './ThreadProvider'

// Mock AI models for UI display (all requests still use the same AI backend)

type LiaThreadProps = {
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
  onRegisterConversationCreatedCallback?: (callback: () => void) => void
  providers?: AIProviderInfo[]
  selectedProvider?: string | null
  onProviderChange?: (providerId: string) => void
}

export function LiaThread({
  activeConversationId,
  setActiveConversationId,
  onRegisterConversationCreatedCallback,
  providers = [],
  selectedProvider,
  onProviderChange,
}: LiaThreadProps) {
  // Check if user is authenticated
  const { isAuthenticated, user } = useAuthStore()
  const rbac = useRBAC(user, 'green-pulse')
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const theme = useTheme()

  const tForms = useTranslations('forms')
  const tChat = useTranslations('chat')
  const tAuth = useTranslations('auth')

  const handleLocaleChange = useCallback(
    (newLocale: string) => {
      const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
      router.push(newPathname)
    },
    [pathname, locale, router]
  )

  const {
    messages,
    loading,
    streamingText,
    sendMessage,
    resendLastMessage,
    editMessage,
    isNewThread,
    clearMessages,
    loadMessages,
  } = useThreadContext()

  const {
    conversations: apiConversations,
    loading: conversationsLoading,
    createConversation,
    renameConversation,
    softDeleteConversation,
    loadConversations,
    refreshConversation,
  } = useConversations()

  // Use React Query to fetch conversation (CACHED! ✅)
  const { data: conversationData } = useConversation(activeConversationId)

  // Register callback to reload conversations when auto-created
  useEffect(() => {
    if (onRegisterConversationCreatedCallback && loadConversations) {
      onRegisterConversationCreatedCallback(() => loadConversations)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterConversationCreatedCallback]) // Only run when callback changes, not loadConversations

  // Load messages from cache when conversationData changes
  useEffect(() => {
    if (conversationData && conversationData.messages) {
      const threadMessages = conversationData.messages.map(
        (msg: { role: string; content: string; timestamp?: Date | string }) => ({
          id: `${msg.role}-${msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()}`,
          role: (msg.role === 'assistant' ? 'ai' : 'user') as 'user' | 'ai',
          content: msg.content,
          timestamp: msg.timestamp
            ? new Date(msg.timestamp).toISOString()
            : new Date().toISOString(),
        })
      )
      loadMessages(threadMessages)
    }
  }, [conversationData, loadMessages])

  // Convert to ThreadSidebar format
  const conversations: Conversation[] = apiConversations.map(conv => ({
    id: conv.id,
    title: conv.title,
    preview: conv.preview,
    timestamp: conv.updatedAt,
    unread: conv.unread || false,
  }))

  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    // Always clear current chat immediately (feedback)
    setActiveConversationId(null)
    clearMessages()

    // If authenticated, also create a new conversation in DB
    if (isAuthenticated) {
      try {
        const newConv = await createConversation('New Chat')
        if (newConv) {
          setActiveConversationId(newConv.id)
        }
      } catch (error) {
        logger.error('Failed to create new conversation:', error)
      }
    }
  }, [createConversation, clearMessages, setActiveConversationId, isAuthenticated])

  // Handle conversation select (NO MORE REFETCH! Uses cache ✅)
  const handleConversationSelect = useCallback(
    (id: string) => {
      setActiveConversationId(id)
      // React Query automatically fetches from cache if available!
      // useConversation(id) hook will handle the rest
    },
    [setActiveConversationId]
  )

  // Handle rename
  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      try {
        await renameConversation(id, newTitle)
      } catch (error) {
        logger.error('Failed to rename conversation:', error)
      }
    },
    [renameConversation]
  )

  // Handle delete
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await softDeleteConversation(id)
        // If deleted conversation was active, clear it
        if (id === activeConversationId) {
          setActiveConversationId(null)
          clearMessages()
        }
      } catch (error) {
        logger.error('Failed to delete conversation:', error)
      }
    },
    [softDeleteConversation, activeConversationId, clearMessages]
  )
  const header = (
    <Div className="h-14 flex items-center justify-center px-3">
      <Button asChild variant={'ghost'} className="w-full">
        <Link href="/">
          <Image
            src="/logo_complet_light.svg"
            alt="GreenPulse.AI Logo"
            width={150}
            height={32}
            className="animate-glow-pulse-sm dark:hidden"
          />
          <Image
            src="/logo_complet_dark.svg"
            alt="GreenPulse.AI Logo"
            width={150}
            height={32}
            className="animate-glow-pulse-sm hidden dark:block"
          />
          <Span className="sr-only">GreenPulse.AI</Span>
        </Link>
      </Button>
    </Div>
  )

  // Navigation items
  const navItems = useMemo(
    () => [
      ...(rbac.hasAnyRole(['admin', 'superadmin'])
        ? [
            {
              href: '/admin',
              label: 'Admin',
              icon: 'lucide:Shield' as const,
              disabled: false,
              disabledMessage: undefined,
            },
          ]
        : []),
    ],
    [rbac, tForms]
  )

  // Tools navigation items
  const toolsItems = useMemo(
    () => [
      {
        href: '/dashboard',
        label: tChat('sidebar.tools.dashboards'),
        icon: 'lucide:LayoutDashboard' as const,
        disabled: true,
      },
      {
        href: '/upload',
        label: tChat('sidebar.tools.uploadFiles'),
        icon: 'lucide:Upload' as const,
        disabled: true,
      },
      {
        href: '/documents',
        label: tChat('sidebar.tools.documents'),
        icon: 'lucide:FileText' as const,
        disabled: true,
      },
      {
        href: '/projects',
        label: tChat('sidebar.tools.myProjects'),
        icon: 'lucide:FolderKanban' as const,
        disabled: true,
      },
      {
        href: '/compliances',
        label: tChat('sidebar.tools.compliances'),
        icon: 'lucide:Shield' as const,
        disabled: true,
      },
    ],
    [tChat]
  )

  const beforeConv = (
    <Nav className="space-y-1">
      {navItems.map(item => {
        const isActive = pathname === item.href

        if (item.disabled) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start opacity-50 cursor-not-allowed"
                  size="sm"
                  disabled
                >
                  <Icon name={item.icon} className="mr-2" size={16} />
                  {item.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.disabledMessage}</TooltipContent>
            </Tooltip>
          )
        }

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              size="sm"
            >
              <Icon name={item.icon} className="mr-2" size={16} />
              {item.label}
            </Button>
          </Link>
        )
      })}
    </Nav>
  )

  // Footer with My Plan, My Tools, and User Info
  const footer = (
    <Div className="space-y-3">
      {/* My plan section */}
      <Div className="space-y-1">
        <Div className="flex items-center gap-2 px-2 py-1">
          <Icon name="lucide:Briefcase" size={16} className="text-muted-foreground" />
          <Span className="text-xs font-medium text-muted-foreground">
            {tChat('sidebar.myPlan')}
          </Span>
        </Div>
        <Div className="px-2">
          <Span className="text-sm font-semibold">{tChat('plans.free')}</Span>
        </Div>
      </Div>

      {/* Separator line */}
      <Div className="border-t border-border mx-2"></Div>

      {/* My tools section - Upgrade */}
      <Div className="space-y-1">
        <Div className="px-2 py-1">
          <Span className="text-xs font-medium text-muted-foreground">
            {tChat('sidebar.upgradePrompt')}
          </Span>
        </Div>
        <Nav className="space-y-0.5">
          {toolsItems.map(item => (
            <Button
              key={item.href}
              variant="ghost"
              className="w-full justify-start opacity-50 cursor-not-allowed h-8 px-2"
              size="sm"
              disabled
            >
              <Icon name={item.icon} className="mr-2" size={14} />
              <Span className="text-xs">{item.label}</Span>
            </Button>
          ))}
        </Nav>
      </Div>

      {/* User menu */}
      <Div className="border-t pt-3">
        <UserMenu
          side="top"
          variant="extended"
          theme={theme}
          languages={[
            { code: 'en', label: 'English' },
            { code: 'fr', label: 'Français' },
            { code: 'vi', label: 'Tiếng Việt' },
          ]}
          currentLocale={locale}
          onLocaleChange={handleLocaleChange}
          texts={{
            signOut: tAuth('logout'),
            manageAccount: tChat('sidebar.settings'),
          }}
        />
      </Div>
    </Div>
  )

  return (
    <ThreadLayout
      colorScheme="custom"
      customTheme={greenPulseThreadTheme}
      sidebarToggle={
        <ThreadSidebarToggle className="fixed left-4 top-4 z-50 lg:hidden" variant="default" />
      }
      sidebar={
        <ThreadSidebar
          header={header}
          afterConversations={beforeConv}
          footer={footer}
          conversations={isAuthenticated ? conversations : []}
          activeConversationId={activeConversationId || undefined}
          onConversationSelect={isAuthenticated ? handleConversationSelect : undefined}
          onNewConversation={handleNewConversation}
          onRename={isAuthenticated ? handleRename : undefined}
          onDelete={isAuthenticated ? handleDelete : undefined}
          newConversationLabel={tChat('sidebar.newChat')}
          emptyState={isAuthenticated ? tChat('sidebar.emptyState') : tChat('sidebar.loginPrompt')}
        />
      }
    >
      <ThreadHeader />

      <Thread messages={messages} streamingText={streamingText}>
        <ThreadMessages
          messages={messages}
          loading={loading}
          streamingText={streamingText}
          isNewThread={isNewThread}
          loadingText="LIA is thinking"
          onRetry={resendLastMessage}
          onEdit={editMessage}
          formatResponseTime={time => `${(time / 1000).toFixed(2)}s`}
        />
      </Thread>

      <ThreadComposer
        onSubmit={sendMessage}
        loading={loading}
        placeholder="Ask GP.A anything about sustainability..."
        isNewThread={isNewThread}
        welcomeMessage={
          <>
            <ThreadWelcome
              show={isNewThread}
              title="Welcome to GP.A"
              description="Your AI assistant for sustainability and ESG reporting"
            />
            {isNewThread && providers.length > 0 && selectedProvider && onProviderChange && (
              <Div className="flex justify-center mt-4">
                <AISelector
                  value={selectedProvider}
                  onChange={onProviderChange}
                  providers={providers}
                  showCapabilities={true}
                />
              </Div>
            )}
          </>
        }
      />
    </ThreadLayout>
  )
}
