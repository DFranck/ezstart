'use client'

import { greenPulseThreadTheme } from '@/config/thread-theme'
import { useConversations } from '@/hooks/useConversations'
import type { AIProviderInfo } from '@ezstart/ai-sdk'
import { AISelector } from '@ezstart/ai-sdk/client'
import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/rbac'
import {
  Button,
  Conversation,
  Div,
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useThreadContext } from './ThreadProvider'

// Mock AI models list
const AI_MODELS = [
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'local-llama', name: 'Llama 3 (Hébergé - Confidentialité)', provider: 'Local' },
] as const

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
  const tForms = useTranslations('forms')
  const tChat = useTranslations('chat')

  // AI Model selection state
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id)

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
    useConversation,
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
      const threadMessages = conversationData.messages.map((msg: any) => ({
        id: `${msg.role}-${msg.timestamp.getTime()}`,
        role: msg.role === 'assistant' ? 'ai' : msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }))
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
    try {
      const newConv = await createConversation('New Chat')
      if (newConv) {
        setActiveConversationId(newConv.id)
        clearMessages()
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error)
    }
  }, [createConversation, clearMessages, setActiveConversationId])

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
        console.error('Failed to rename conversation:', error)
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
        console.error('Failed to delete conversation:', error)
      }
    },
    [softDeleteConversation, activeConversationId, clearMessages]
  )
  const header = (
    <Div size={'xs'} layout={'center'}>
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
          <span className="sr-only">GreenPulse.AI</span>
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
    <nav className="space-y-1">
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
    </nav>
  )

  // Footer with My Plan, My Tools, and User Info
  const footer = (
    <Div className="space-y-3">
      {/* My plan section */}
      <Div className="space-y-1">
        <Div className="flex items-center gap-2 px-2 py-1">
          <Icon name="lucide:Briefcase" size={16} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {tChat('sidebar.myPlan')}
          </span>
        </Div>
        <Div className="px-2">
          <span className="text-sm font-semibold">{tChat('plans.free')}</span>
        </Div>
      </Div>

      {/* My tools section */}
      <Div className="space-y-1">
        <Div className="flex items-center gap-2 px-2 py-1">
          <Icon name="lucide:Settings" size={16} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {tChat('sidebar.myTools')}
          </span>
        </Div>
        <nav className="space-y-0.5">
          {toolsItems.map(item => (
            <Button
              key={item.href}
              variant="ghost"
              className="w-full justify-start opacity-50 cursor-not-allowed h-8 px-2"
              size="sm"
              disabled
            >
              <Icon name={item.icon} className="mr-2" size={14} />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </nav>
      </Div>

      {/* User info section */}
      <Div className="border-t pt-3 space-y-2">
        <Button variant="ghost" className="w-full justify-start h-auto py-2 px-2">
          <Div className="flex items-center gap-2 w-full">
            <Div className="w-8 h-8 rounded-full bg-gp-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name="lucide:User" size={16} className="text-gp-primary" />
            </Div>
            <Div className="flex-1 min-w-0 text-left">
              <Div className="text-sm font-medium truncate">
                {user?.firstName || user?.email || 'User'}
              </Div>
              {user?.email && (
                <Div className="text-xs text-muted-foreground truncate">{user.email}</Div>
              )}
            </Div>
          </Div>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start opacity-50 cursor-not-allowed h-8 px-2"
          size="sm"
          disabled
        >
          <Icon name="lucide:Settings" className="mr-2" size={14} />
          <span className="text-xs">{tChat('sidebar.settings')}</span>
        </Button>
      </Div>
    </Div>
  )

  return (
    <ThreadLayout
      colorScheme="custom"
      customTheme={greenPulseThreadTheme}
      sidebarToggle={
        // Only show sidebar toggle if authenticated
        isAuthenticated ? (
          <ThreadSidebarToggle className="fixed right-4 top-4 z-50 lg:hidden" variant="default" />
        ) : undefined
      }
      sidebar={
        // Only show conversations list if authenticated
        isAuthenticated ? (
          <ThreadSidebar
            header={header}
            afterConversations={beforeConv}
            footer={footer}
            conversations={conversations}
            activeConversationId={activeConversationId || undefined}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            onRename={handleRename}
            onDelete={handleDelete}
            newConversationLabel={tChat('sidebar.newChat')}
            emptyState={tChat('sidebar.emptyState')}
          />
        ) : undefined
      }
    >
      {/* Thread Header with AI Model selector and Theme switcher */}
      <ThreadHeader
        left={
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Sélectionner un modèle" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <Div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.provider}</span>
                  </Div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        right={<ThemeSwitcher />}
      />

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
          <ThreadWelcome
            show={isNewThread}
            title="Welcome to GP.A"
            description="Your AI assistant for sustainability and ESG reporting"
          />
        }
        headerSlot={
          providers.length > 0 && selectedProvider && onProviderChange ? (
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <AISelector
                value={selectedProvider}
                onChange={onProviderChange}
                providers={providers}
                showCapabilities={true}
              />
            </div>
          ) : null
        }
      />
    </ThreadLayout>
  )
}
