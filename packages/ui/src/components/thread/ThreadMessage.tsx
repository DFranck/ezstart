'use client';

import clsx from 'clsx';
import { ReactNode, useState } from 'react';
import { ThreadMessageMeta } from './types';

type ThreadMessageProps = {
  role: 'user' | 'ai';
  children: ReactNode;
  meta?: ThreadMessageMeta;
  isLastUserMessage?: boolean;
  onRetry?: () => void;
  onCopy?: (content: string) => void;
  retryText?: string;
  showCopyButton?: boolean;
  formatResponseTime?: (time: number) => string;
};

export function ThreadMessage({
  role,
  children,
  meta,
  isLastUserMessage,
  onRetry,
  onCopy,
  retryText = 'Retry',
  showCopyButton = true,
  formatResponseTime,
}: ThreadMessageProps) {
  const isUser = role === 'user';
  const [isHover, setIsHover] = useState(false);
  const shouldShowRetry = isUser && isLastUserMessage && onRetry;

  const handleCopy = () => {
    if (onCopy && typeof children === 'string') {
      onCopy(children);
    }
  };

  return (
    <article
      data-testid={`conversation-turn-${isUser ? 'user' : 'ai'}`}
      data-turn={role}
      tabIndex={-1}
      dir='auto'
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      className={clsx(
        "animate-in data-[turn='user']:animate-in-from-right data-[turn='ai']:animate-in-from-left",
        'w-full focus:outline-none text-token-text-primary',
        'relative-group',
        isUser
          ? 'scroll-mt-[--header-height]'
          : 'scroll-mt-[calc(var(--header-height)+min(200px,max(70px,20svh)))]'
      )}
    >
      <div className='text-base mx-auto pt-3'>
        <div className='flex flex-col gap-2'>
          <div
            className={clsx('flex w-full', isUser ? 'justify-end' : 'justify-start')}
          >
            <div
              className={clsx(
                'rounded-lg px-4 py-2 whitespace-pre-wrap break-words max-w-[80%] shadow-sm',
                'overflow-hidden leading-tight select-text',
                isUser
                  ? 'bg-primary/40 text-primary-foreground'
                  : 'bg-background text-muted-foreground'
              )}
              data-message-author-role={role}
            >
              {children}

              {shouldShowRetry && (
                <div className='mt-3 text-xs flex justify-end'>
                  <button
                    onClick={onRetry}
                    className='underline hover:opacity-80 transition'
                  >
                    {retryText}
                  </button>
                </div>
              )}

              {role === 'ai' && meta?.timestamp && (
                <p className='mt-2 text-xs text-muted-foreground text-right'>
                  {new Date(meta.timestamp).toLocaleTimeString()} —{' '}
                  {meta.responseTime && formatResponseTime
                    ? formatResponseTime(meta.responseTime)
                    : meta.responseTime
                      ? `${meta.responseTime}ms`
                      : '–'}
                </p>
              )}
            </div>
          </div>

          {showCopyButton && isHover && (
            <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
              <button
                onClick={handleCopy}
                className='text-xs text-muted-foreground hover:text-foreground transition-colors'
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}