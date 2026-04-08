'use client'

import React, { Fragment, ReactNode, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../button'
import { Icon } from '../icon'
import { ConversationItem } from './ConversationItem'
import { useThreadLayout } from './ThreadLayoutContext'

export type Conversation = {
  id: string
  title: string
  preview?: string
  timestamp?: Date
  unread?: boolean
}

type ThreadSidebarProps = {
  conversations?: Conversation[]
  activeConversationId?: string
  onConversationSelect?: (id: string) => void
  onNewConversation?: () => void
  onRename?: (id: string, newTitle: string) => void | Promise<void>
  onDelete?: (id: string) => void | Promise<void>
  onClose?: () => void // Callback to close sidebar (mobile)
  newConversationLabel?: string
  emptyState?: ReactNode
  header?: ReactNode // Custom content above "New conversation" button
  footer?: ReactNode // Custom content at bottom
  beforeConversations?: ReactNode // Custom content between "New conversation" and conversation list
  afterConversations?: ReactNode // Custom content after conversation list
  className?: string
  renderConversation?: (conversation: Conversation, isActive: boolean) => ReactNode
}

export const ThreadSidebar = React.memo(function ThreadSidebar({
  conversations = [],
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  onRename,
  onDelete,
  onClose,
  newConversationLabel = 'New conversation',
  emptyState,
  header,
  footer,
  beforeConversations,
  afterConversations,
  className,
  renderConversation,
}: ThreadSidebarProps) {
  const layoutContext = useThreadLayout()
  const formatTimestamp = useCallback((date?: Date) => {
    if (!date) return ''
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }, [])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Custom header slot (above everything) */}
      {header && <div className="border-b">{header}</div>}

      {/* Before conversations slot (navigation, filters, etc.) */}
      {beforeConversations && <div className="p-2 border-b">{beforeConversations}</div>}

      {/* New conversation button (always visible if onNewConversation provided) */}
      {onNewConversation && (
        <div className="p-4 border-b">
          <Button
            onClick={onNewConversation}
            className="w-full"
            variant="default"
            aria-label="Create new conversation"
          >
            <Icon name="lucide:Plus" size={16} className="mr-2" ariaHidden />
            {newConversationLabel}
          </Button>
        </div>
      )}

      {/* Conversations List */}
      <nav
        role="navigation"
        aria-label="Conversation history"
        className="flex-1 overflow-y-auto min-h-0"
      >
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
              {emptyState || 'No conversations yet'}
            </div>
          ) : (
            conversations.map(conversation => {
              const isActive = conversation.id === activeConversationId

              if (renderConversation) {
                return (
                  <Fragment key={conversation.id}>
                    {renderConversation(conversation, isActive)}
                  </Fragment>
                )
              }

              return (
                <ConversationItem
                  key={conversation.id}
                  id={conversation.id}
                  title={conversation.title}
                  preview={conversation.preview}
                  timestamp={conversation.timestamp}
                  unread={conversation.unread}
                  isActive={isActive}
                  onSelect={id => {
                    onConversationSelect?.(id)
                    onClose?.()
                    layoutContext?.closeSidebar()
                  }}
                  onRename={onRename}
                  onDelete={onDelete}
                  formatTimestamp={formatTimestamp}
                />
              )
            })
          )}
        </div>
      </nav>

      {/* After conversations slot (fixed at bottom, above footer) */}
      {afterConversations && <div className="p-2 border-t shrink-0">{afterConversations}</div>}

      {/* Footer */}
      {footer && <div className="p-4 border-t">{footer}</div>}
    </div>
  )
})
