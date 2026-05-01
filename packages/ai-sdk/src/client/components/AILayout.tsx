/**
 * AILayout Component
 * Complete AI chat layout with sidebar, messages, composer, and welcome screen.
 * Wraps Thread UI components with AIProvider and useAIThread hook.
 */
'use client'

import {
  Button,
  Div,
  H2,
  P,
  Thread,
  ThreadComposer,
  ThreadLayout,
  ThreadMessages,
  ThreadSidebar,
  ThreadWelcome,
} from '@ezstart/ui/components'

import { LoginButton, useAuth } from '@ezstart/auth-sdk'

import { AIProvider } from '../../provider.js'
import { useAIThread } from '../hooks/useAIThread.js'
import { AISelector } from './AISelector.js'
import type { AILayoutProps } from './ai-layout-types.js'

/**
 * AILayout - Full-featured AI chat layout
 *
 * Wraps everything in AIProvider and composes Thread UI components
 * following the same pattern as LiaThread in green-pulse.
 *
 * @example
 * ```tsx
 * <AILayout
 *   appName="green-pulse"
 *   getToken={() => authStore.getState().token}
 *   locale="en"
 *   colorScheme="green"
 *   texts={{ welcomeTitle: 'Welcome!', composerPlaceholder: 'Ask anything...' }}
 * />
 * ```
 */
export function AILayout({ appName, getToken, ...props }: AILayoutProps) {
  return (
    <AIProvider appName={appName} getToken={getToken}>
      <AILayoutContent appName={appName} {...props} />
    </AIProvider>
  )
}

function AILayoutContent({ ...props }: Omit<AILayoutProps, 'getToken'>) {
  const { user, isLoggingOut } = useAuth()
  const isAdmin = user?.globalRoles?.includes('admin') || user?.globalRoles?.includes('superadmin')

  const {
    messages,
    loading,
    streamingText,
    isNewThread,
    conversations,
    activeConversationId,
    isAuthenticated,
    providers,
    providersLoading,
    selectedProvider,
    setSelectedProvider,
    sendMessage,
    resendLastMessage,
    editMessage,
    handleConversationSelect,
    handleNewConversation,
    handleRename,
    handleDelete,
  } = useAIThread({
    appName: props.appName,
    locale: props.locale,
    extraPayload: props.extraPayload,
    onError: props.onError,
    onConversationCreated: props.onConversationCreated,
  })

  const texts = props.texts ?? {}
  const slots = props.slots ?? {}
  const showSidebar = props.showSidebar ?? true
  const showProviderSelector = props.showProviderSelector ?? false

  // Unauthenticated users always see a sign-in prompt (provider list is 401-gated)
  // During logout transition, keep showing the authenticated layout to avoid layout flash
  const showLoginPrompt = !isAuthenticated && !isLoggingOut
  const loginPromptTitle = texts.loginPromptTitle ?? 'Sign in to start chatting'
  const loginPromptDescription =
    texts.loginPromptDescription ?? 'Log in to your account to chat with the AI assistant.'
  const loginPromptCTA = texts.loginPromptCTA ?? 'Sign in'
  const loginPromptComposerPlaceholder = texts.loginPromptComposerPlaceholder ?? 'Sign in to chat'

  // No providers available → empty state (avoid letting user send messages that will fail)
  // Only show this when authenticated (otherwise the 401-empty providers list would
  // falsely trigger the admin message for logged-out users).
  const noProviders = isAuthenticated && !providersLoading && providers.length === 0
  const noProvidersTitle = texts.noProvidersTitle ?? 'No AI provider configured'
  const noProvidersDescription =
    texts.noProvidersDescription ??
    'An admin needs to configure at least 1 AI provider before you can chat.'
  const noProvidersCTA = texts.noProvidersCTA ?? 'Configure providers'
  const noProvidersComposerPlaceholder =
    texts.noProvidersComposerPlaceholder ?? 'AI providers not configured'
  const adminHref = props.adminHref ?? '/admin'
  const onAdminClick = props.onAdminClick

  const composerDisabled = showLoginPrompt || noProviders
  const composerPlaceholder = showLoginPrompt
    ? loginPromptComposerPlaceholder
    : noProviders
      ? noProvidersComposerPlaceholder
      : texts.composerPlaceholder

  // Build sidebar content
  // During logout, keep showing authenticated sidebar to avoid layout flash
  const effectivelyAuthenticated = isAuthenticated || isLoggingOut
  const sidebar = showSidebar ? (
    <ThreadSidebar
      conversations={effectivelyAuthenticated ? conversations : []}
      activeConversationId={activeConversationId ?? undefined}
      onConversationSelect={effectivelyAuthenticated ? handleConversationSelect : undefined}
      onNewConversation={handleNewConversation}
      onRename={effectivelyAuthenticated ? handleRename : undefined}
      onDelete={effectivelyAuthenticated ? handleDelete : undefined}
      newConversationLabel={texts.newChatLabel}
      newConversationDisabled={!effectivelyAuthenticated}
      emptyState={
        effectivelyAuthenticated
          ? texts.sidebarEmptyState
          : (texts.loginPrompt ?? 'Log in to save your conversations')
      }
      header={slots.sidebarHeader}
      footer={slots.sidebarFooter}
      beforeConversations={slots.sidebarBeforeConversations}
      afterConversations={slots.sidebarAfterConversations}
    />
  ) : undefined

  return (
    <Div className={props.className}>
      <ThreadLayout
        height={props.height ?? 'viewport'}
        headerOffset={props.headerOffset}
        mobileHeaderOffset={props.mobileHeaderOffset}
        mobileFooterOffset={props.mobileFooterOffset}
        showSidebarCloseButton={props.showSidebarCloseButton}
        sidebar={sidebar}
      >
        <Thread messages={messages} streamingText={streamingText}>
          <ThreadMessages
            messages={messages}
            loading={loading}
            streamingText={streamingText}
            isNewThread={isNewThread}
            loadingText={texts.loadingText}
            onRetry={resendLastMessage}
            onEdit={editMessage}
            formatResponseTime={
              props.formatResponseTime ?? ((time: number) => `${(time / 1000).toFixed(2)}s`)
            }
          />
        </Thread>

        <ThreadComposer
          onSubmit={sendMessage}
          loading={loading}
          disabled={composerDisabled}
          placeholder={composerPlaceholder}
          sendLabel={texts.sendLabel}
          isNewThread={isNewThread}
          welcomeMessage={
            isNewThread
              ? (slots.welcomeContent ??
                (showLoginPrompt ? (
                  <Div className="flex flex-col items-center justify-center text-center text-foreground gap-3 px-4">
                    <H2 className="text-xl font-semibold">{loginPromptTitle}</H2>
                    <P className="text-sm text-muted-foreground max-w-md">
                      {loginPromptDescription}
                    </P>
                    <LoginButton
                      variant="default"
                      size="sm"
                      className="mt-2"
                      alwaysShowText
                      loginText={loginPromptCTA}
                    />
                  </Div>
                ) : noProviders ? (
                  <Div className="flex flex-col items-center justify-center text-center text-foreground gap-3 px-4">
                    <H2 className="text-xl font-semibold">{noProvidersTitle}</H2>
                    <P className="text-sm text-muted-foreground max-w-md">
                      {noProvidersDescription}
                    </P>
                    {isAdmin &&
                      (onAdminClick ? (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="mt-2"
                          onClick={onAdminClick}
                        >
                          {noProvidersCTA}
                        </Button>
                      ) : (
                        <Button asChild variant="default" size="sm" className="mt-2">
                          <a href={adminHref}>{noProvidersCTA}</a>
                        </Button>
                      ))}
                  </Div>
                ) : (
                  <>
                    <ThreadWelcome
                      show={isNewThread}
                      title={texts.welcomeTitle}
                      description={texts.welcomeDescription}
                    />
                    {showProviderSelector &&
                      providers.length > 0 &&
                      selectedProvider &&
                      isAdmin && (
                        <Div className="flex justify-center mt-4">
                          <AISelector
                            value={selectedProvider}
                            onChange={setSelectedProvider}
                            providers={providers}
                          />
                        </Div>
                      )}
                    {slots.welcomeExtra}
                  </>
                )))
              : undefined
          }
        />
      </ThreadLayout>
    </Div>
  )
}
