'use client';

import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Icon } from '../icon';
import { ConversationItemActions } from './ConversationItemActions';

export type Conversation = {
  id: string;
  title: string;
  preview?: string;
  timestamp?: Date;
  unread?: boolean;
};

type ThreadSidebarProps = {
  conversations?: Conversation[];
  activeConversationId?: string;
  onConversationSelect?: (id: string) => void;
  onNewConversation?: () => void;
  onRename?: (id: string, newTitle: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  newConversationLabel?: string;
  emptyState?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  renderConversation?: (conversation: Conversation, isActive: boolean) => ReactNode;
};

export function ThreadSidebar({
  conversations = [],
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  onRename,
  onDelete,
  newConversationLabel = 'New conversation',
  emptyState,
  header,
  footer,
  className,
  renderConversation,
}: ThreadSidebarProps) {
  const formatTimestamp = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      {header ? (
        header
      ) : (
        <div className="p-4 border-b">
          <Button
            onClick={onNewConversation}
            className="w-full"
            variant="default"
          >
            <Icon name="lucide:Plus" size={16} className="mr-2" />
            {newConversationLabel}
          </Button>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
              {emptyState || 'No conversations yet'}
            </div>
          ) : (
            conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;

              if (renderConversation) {
                return renderConversation(conversation, isActive);
              }

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    'relative group',
                    'w-full rounded-lg transition-colors',
                    'hover:bg-accent',
                    isActive && 'bg-accent'
                  )}
                >
                  <button
                    onClick={() => onConversationSelect?.(conversation.id)}
                    className={cn(
                      'w-full text-left p-3',
                      conversation.unread && 'font-semibold'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium truncate">
                            {conversation.title}
                          </h3>
                          {conversation.unread && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        {conversation.preview && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conversation.preview}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {conversation.timestamp && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTimestamp(conversation.timestamp)}
                          </span>
                        )}
                        <ConversationItemActions
                          conversationId={conversation.id}
                          conversationTitle={conversation.title}
                          onRename={onRename}
                          onDelete={onDelete}
                        />
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      {footer && <div className="p-4 border-t">{footer}</div>}
    </div>
  );
}