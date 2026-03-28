'use client';

import clsx from 'clsx';
import React, { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icon } from '../icon';
import { ThreadMessageMeta } from './types';
import { useThreadTheme } from './ThreadThemeContext';

type ThreadMessageProps = {
  role: 'user' | 'ai';
  children: ReactNode;
  meta?: ThreadMessageMeta;
  isLastUserMessage?: boolean;
  onRetry?: () => void;
  onCopy?: (content: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  messageId?: string;
  hasResponse?: boolean;
  retryText?: string;
  showCopyButton?: boolean;
  formatResponseTime?: (time: number) => string;
  userBubbleClassName?: string;
  aiBubbleClassName?: string;
};

export const ThreadMessage = React.memo(function ThreadMessage({
  role,
  children,
  meta,
  isLastUserMessage,
  onRetry,
  onCopy,
  onEdit,
  messageId,
  hasResponse = false,
  retryText = 'Retry',
  showCopyButton = true,
  formatResponseTime,
  userBubbleClassName,
  aiBubbleClassName,
}: ThreadMessageProps) {
  const { theme } = useThreadTheme();
  const isUser = role === 'user';
  const [isHover, setIsHover] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(
    typeof children === 'string' ? children : ''
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldShowRetry = isUser && isLastUserMessage && onRetry;
  const shouldShowEditCopy = isUser && !isLastUserMessage && hasResponse && onEdit && messageId;

  // Get bubble styles from theme
  const defaultUserBubble = clsx(
    theme.message?.user?.background || 'bg-primary',
    theme.message?.user?.text || 'text-primary-foreground',
    theme.message?.user?.border
  );
  const defaultAiBubble = clsx(
    theme.message?.ai?.background || 'bg-muted',
    theme.message?.ai?.text || 'text-foreground',
    theme.message?.ai?.border
  );

  const handleCopy = useCallback(() => {
    if (onCopy && typeof children === 'string') {
      onCopy(children);
    }
  }, [onCopy, children]);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditedContent(typeof children === 'string' ? children : '');
  }, [children]);

  const handleEditSave = useCallback(() => {
    if (onEdit && messageId && editedContent.trim()) {
      onEdit(messageId, editedContent.trim());
      setIsEditing(false);
    }
  }, [onEdit, messageId, editedContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  }, [handleEditSave, handleEditCancel]);

  // Auto-focus and auto-resize textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  // Auto-resize on content change
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editedContent, isEditing]);

  return (
    <article
      role="article"
      aria-label={isUser ? 'Your message' : 'Assistant response'}
      data-testid={`conversation-turn-${isUser ? 'user' : 'ai'}`}
      data-turn={role}
      tabIndex={-1}
      dir='auto'
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      className={clsx(
        "animate-in data-[turn='user']:animate-in-from-right data-[turn='ai']:animate-in-from-left",
        'w-full focus:outline-none text-foreground',
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
                'relative group/message',
                'rounded-lg px-4 py-2 max-w-[80%] shadow-sm',
                isEditing ? 'p-2' : 'whitespace-pre-wrap break-words overflow-hidden leading-tight select-text',
                isUser
                  ? userBubbleClassName || defaultUserBubble
                  : aiBubbleClassName || defaultAiBubble
              )}
              data-message-author-role={role}
            >
              {isEditing ? (
                <div className='flex flex-col gap-2'>
                  <label htmlFor={`edit-${messageId}`} className="sr-only">
                    Edit message content
                  </label>
                  <textarea
                    id={`edit-${messageId}`}
                    ref={textareaRef}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-label="Edit message content"
                    aria-describedby={`edit-help-${messageId}`}
                    className='w-full min-h-[60px] px-3 py-2 bg-background text-foreground rounded border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary'
                    placeholder='Edit your message...'
                  />
                  <span id={`edit-help-${messageId}`} className="sr-only">
                    Press Enter to save, Escape to cancel
                  </span>
                  <div className='flex justify-end gap-2'>
                    <button
                      onClick={handleEditCancel}
                      aria-label="Cancel editing"
                      className='px-3 py-1 text-xs rounded hover:bg-muted transition'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditSave}
                      aria-label="Save edited message"
                      className='px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 transition'
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {role === 'ai' && typeof children === 'string' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                          code: ({ node, inline, ...props }: any) =>
                            inline ? (
                              <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props} />
                            ) : (
                              <code className="block bg-muted p-2 rounded text-sm my-2 overflow-x-auto" {...props} />
                            ),
                          strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                          em: ({ node, ...props }) => <em className="italic" {...props} />,
                          a: ({ node, ...props }) => (
                            <a className="text-primary underline hover:opacity-80" {...props} />
                          ),
                        }}
                      >
                        {children}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    children
                  )}

                  {shouldShowRetry && (
                    <div className='mt-3 text-xs flex justify-end'>
                      <button
                        onClick={onRetry}
                        aria-label="Retry sending message"
                        className='underline hover:opacity-80 transition'
                      >
                        {retryText}
                      </button>
                    </div>
                  )}

                  {shouldShowEditCopy && (
                    <div className={clsx(
                      'mt-2 flex items-center justify-end gap-2',
                      'transition-opacity',
                      isHover ? 'opacity-100' : 'opacity-0'
                    )}>
                      <button
                        onClick={handleCopy}
                        className='p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1'
                        aria-label="Copy message to clipboard"
                      >
                        <Icon name="lucide:Copy" size={12} ariaHidden />
                        <span className="text-[10px]">Copy</span>
                      </button>
                      <button
                        onClick={handleEditClick}
                        className='p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1'
                        aria-label="Edit this message"
                      >
                        <Icon name="lucide:Pencil" size={12} ariaHidden />
                        <span className="text-[10px]">Edit</span>
                      </button>
                    </div>
                  )}

                  {role === 'ai' && meta?.timestamp && (
                    <div className='mt-2 flex items-center justify-end gap-2'>
                      <p className='text-xs text-muted-foreground'>
                        {new Date(meta.timestamp).toLocaleTimeString()} —{' '}
                        {meta.responseTime && formatResponseTime
                          ? formatResponseTime(meta.responseTime)
                          : meta.responseTime
                            ? `${meta.responseTime}ms`
                            : '–'}
                      </p>
                      {showCopyButton && (
                        <button
                          onClick={handleCopy}
                          className={clsx(
                            'p-1 rounded hover:bg-black/10 dark:hover:bg-white/10',
                            'transition-opacity',
                            isHover ? 'opacity-100' : 'opacity-0',
                            'flex items-center gap-1'
                          )}
                          aria-label="Copy message to clipboard"
                        >
                          <Icon name="lucide:Copy" size={12} ariaHidden />
                          <span className="text-[10px]">Copy</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});