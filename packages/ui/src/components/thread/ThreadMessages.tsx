'use client';

import React from 'react';
import { ThreadMessage } from './ThreadMessage';
import { ThreadMessage as ThreadMessageType } from './types';

type ThreadMessagesProps<TMessage extends ThreadMessageType = ThreadMessageType> = {
  messages: TMessage[];
  loading?: boolean;
  streamingText?: string;
  isNewThread?: boolean;
  renderMessage?: (message: TMessage, index: number) => React.ReactNode;
  loadingText?: string;
  onRetry?: () => void;
  onCopy?: (content: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  formatResponseTime?: (time: number) => string;
  userBubbleClassName?: string;
  aiBubbleClassName?: string;
};

export const ThreadMessages = React.memo(function ThreadMessages<TMessage extends ThreadMessageType = ThreadMessageType>({
  messages,
  loading = false,
  streamingText = '',
  isNewThread = false,
  renderMessage,
  loadingText = 'Loading',
  onRetry,
  onCopy,
  onEdit,
  formatResponseTime,
  userBubbleClassName,
  aiBubbleClassName,
}: ThreadMessagesProps<TMessage>) {
  const shouldShowLoading =
    (loading || streamingText) &&
    (messages.length > 0 || (isNewThread && streamingText));

  return (
    <div className='flex flex-col h-full justify-end w-full max-w-4xl mx-auto'>
      {messages.map((msg, index) => {
        if (renderMessage) {
          return renderMessage(msg, index);
        }

        const key = (msg as any).id ?? `${msg.timestamp ?? 't'}-${index}`;
        const isLast = index === messages.length - 1;
        const hasResponse = index < messages.length - 1;

        return (
          <ThreadMessage
            key={key}
            role={msg.role}
            messageId={(msg as any).id}
            hasResponse={hasResponse}
            meta={
              msg.role === 'ai'
                ? {
                    timestamp: msg.timestamp,
                    responseTime: msg.responseTime,
                  }
                : undefined
            }
            isLastUserMessage={isLast && msg.role === 'user'}
            onRetry={isLast && msg.role === 'user' ? onRetry : undefined}
            onCopy={onCopy}
            onEdit={msg.role === 'user' ? onEdit : undefined}
            formatResponseTime={formatResponseTime}
            userBubbleClassName={userBubbleClassName}
            aiBubbleClassName={aiBubbleClassName}
          >
            {msg.content}
          </ThreadMessage>
        );
      })}

      {shouldShowLoading && (
        <ThreadMessage role='ai' aiBubbleClassName={aiBubbleClassName}>
          {streamingText ? (
            <div role="status" aria-live="polite" aria-atomic="true">
              {streamingText}
              <span className='inline-block animate-pulse' aria-hidden="true">|</span>
            </div>
          ) : (
            <div
              role="status"
              aria-live="polite"
              aria-label="Loading response"
              className='flex items-center gap-1 text-muted-foreground italic'
            >
              {loadingText}
              <span className='animate-bounce text-lg font-bold' aria-hidden="true">.</span>
              <span
                className='animate-bounce text-lg font-bold'
                style={{ animationDelay: '0.2s' }}
                aria-hidden="true"
              >
                .
              </span>
              <span
                className='animate-bounce text-lg font-bold'
                style={{ animationDelay: '0.4s' }}
                aria-hidden="true"
              >
                .
              </span>
            </div>
          )}
        </ThreadMessage>
      )}

      {/* Spacing after last message */}
      <div className='h-6' />
    </div>
  );
}) as <TMessage extends ThreadMessageType = ThreadMessageType>(
  props: ThreadMessagesProps<TMessage>
) => React.ReactElement;