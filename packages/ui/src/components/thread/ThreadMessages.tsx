'use client';

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
  formatResponseTime?: (time: number) => string;
  userBubbleClassName?: string;
  aiBubbleClassName?: string;
};

export function ThreadMessages<TMessage extends ThreadMessageType = ThreadMessageType>({
  messages,
  loading = false,
  streamingText = '',
  isNewThread = false,
  renderMessage,
  loadingText = 'Loading',
  onRetry,
  onCopy,
  formatResponseTime,
  userBubbleClassName,
  aiBubbleClassName,
}: ThreadMessagesProps<TMessage>) {
  const shouldShowLoading =
    (loading || streamingText) &&
    (messages.length > 0 || (isNewThread && streamingText));

  return (
    <div className='flex flex-col h-full justify-end w-full'>
      {messages.map((msg, index) => {
        if (renderMessage) {
          return renderMessage(msg, index);
        }

        const key = (msg as any).id ?? `${msg.timestamp ?? 't'}-${index}`;
        const isLast = index === messages.length - 1;

        return (
          <ThreadMessage
            key={key}
            role={msg.role}
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
            <span>
              {streamingText}
              <span className='inline-block animate-pulse'>|</span>
            </span>
          ) : (
            <div className='flex items-center gap-1 text-muted-foreground italic'>
              {loadingText}
              <span className='animate-bounce text-lg font-bold'>.</span>
              <span
                className='animate-bounce text-lg font-bold'
                style={{ animationDelay: '0.2s' }}
              >
                .
              </span>
              <span
                className='animate-bounce text-lg font-bold'
                style={{ animationDelay: '0.4s' }}
              >
                .
              </span>
            </div>
          )}
        </ThreadMessage>
      )}
    </div>
  );
}