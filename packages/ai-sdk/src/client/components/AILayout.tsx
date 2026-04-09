/**
 * AILayout Component
 * Complete AI chat layout with sidebar, messages, composer, and welcome screen.
 * Wraps Thread UI components with AIProvider and useAIThread hook.
 */
'use client'

import {
  Div,
  Thread,
  ThreadComposer,
  ThreadLayout,
  ThreadMessages,
  ThreadSidebar,
  ThreadSidebarToggle,
  ThreadWelcome,
} from '@ezstart/ui/components'

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
      <AILayoutInner appName={appName} {...props} />
    </AIProvider>
  )
}

function AILayoutInner({ getToken: _getToken, ...props }: AILayoutProps) {
  const {
    messages,
    loading,
    streamingText,
    isNewThread,
    conversations,
    activeConversationId,
    isAuthenticated,
    providers,
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
  const showSidebar = props.showSidebar ?? isAuthenticated
  const showProviderSelector = props.showProviderSelector ?? false

  // Build sidebar content
  const sidebar = showSidebar ? (
    <ThreadSidebar
      conversations={conversations}
      activeConversationId={activeConversationId ?? undefined}
      onConversationSelect={handleConversationSelect}
      onNewConversation={handleNewConversation}
      onRename={handleRename}
      onDelete={handleDelete}
      newConversationLabel={texts.newChatLabel}
      emptyState={texts.sidebarEmptyState}
      header={slots.sidebarHeader}
      footer={slots.sidebarFooter}
      beforeConversations={slots.sidebarBeforeConversations}
      afterConversations={slots.sidebarAfterConversations}
    />
  ) : undefined

  return (
    <Div className={props.className}>
      <ThreadLayout
        colorScheme={props.colorScheme}
        customTheme={props.customTheme}
        headerOffset={props.headerOffset}
        mobileHeaderOffset={props.mobileHeaderOffset}
        mobileFooterOffset={props.mobileFooterOffset}
        sidebar={sidebar}
        sidebarToggle={
          showSidebar ? (
            <ThreadSidebarToggle className="fixed left-4 top-4 z-50 lg:hidden" variant="default" />
          ) : undefined
        }
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
          placeholder={texts.composerPlaceholder}
          sendLabel={texts.sendLabel}
          isNewThread={isNewThread}
          welcomeMessage={
            isNewThread
              ? (slots.welcomeContent ?? (
                  <>
                    <ThreadWelcome
                      show={isNewThread}
                      title={texts.welcomeTitle}
                      description={texts.welcomeDescription}
                    />
                    {showProviderSelector && providers.length > 0 && selectedProvider && (
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
                ))
              : undefined
          }
        />
      </ThreadLayout>
    </Div>
  )
}
