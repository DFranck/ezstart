'use client'

import { Send } from 'lucide-react'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '../button'
import { cn } from '../../lib/utils'
import { useThreadLayout } from './ThreadLayoutContext'

type ThreadComposerProps = {
  onSubmit: (message: string, files?: File[]) => Promise<void> | void
  loading?: boolean
  disabled?: boolean
  placeholder?: string
  welcomeMessage?: React.ReactNode
  showFileUpload?: boolean
  className?: string
  isNewThread?: boolean
  files?: File[]
  onFilesChange?: (files: File[]) => void
  removeFileText?: string
  sendLabel?: string
  headerSlot?: React.ReactNode
}

export const ThreadComposer = React.memo(function ThreadComposer({
  onSubmit,
  loading = false,
  disabled = false,
  placeholder = 'Type your message...',
  welcomeMessage,
  showFileUpload = false,
  className,
  isNewThread = false,
  files = [],
  onFilesChange,
  removeFileText = 'Remove',
  sendLabel = 'Send message',
  headerSlot,
}: ThreadComposerProps) {
  const layoutContext = useThreadLayout()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [message, setMessage] = useState('')

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return

    const MAX = 110
    el.style.height = 'auto'
    const h = Math.min(el.scrollHeight, MAX)
    el.style.height = `${h}px`
    el.style.overflowY = el.scrollHeight > MAX ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [message, resizeTextarea])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!message.trim() || loading || disabled) return

      // Clear message IMMEDIATELY before submit (better UX)
      const messageToSend = message
      setMessage('')
      setTimeout(resizeTextarea, 0)

      await onSubmit(messageToSend, files)
    },
    [message, loading, disabled, resizeTextarea, onSubmit, files]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!loading && !disabled && message.trim()) {
          handleSubmit(e)
        }
      }
    },
    [loading, disabled, message, handleSubmit]
  )

  const removeFile = useCallback(
    (index: number) => {
      if (onFilesChange) {
        onFilesChange(files.filter((_, i) => i !== index))
      }
    },
    [onFilesChange, files]
  )

  return (
    <div
      className={cn(
        'w-full z-10 pb-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        'transition-transform duration-300 ease-in-out',
        layoutContext?.mobileFooterOffset && `md:pb-6 ${layoutContext.mobileFooterOffset}`,
        className
      )}
    >
      {welcomeMessage}
      <div className="px-4 max-w-4xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className={cn(
            'relative flex flex-col items-center backdrop-blur',
            'rounded-lg border bg-background shadow-lg',
            'w-full'
          )}
        >
          {headerSlot}
          <div className="flex flex-col w-full items-end">
            {files.length > 0 && (
              <div className="w-full px-3 pt-2 pb-1 space-y-1">
                {files.map((file, i) => (
                  <div
                    key={`${file.name}-${file.size}-${i}`}
                    className="flex items-center justify-between text-xs text-muted-foreground bg-muted px-3 py-1 rounded shadow"
                  >
                    <span className="truncate max-w-[80%]">📎 {file.name}</span>
                    <Button type="button" onClick={() => removeFile(i)} size="sm" variant="outline">
                      {removeFileText}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <label htmlFor="thread-composer-input" className="sr-only">
              Type your message
            </label>
            <textarea
              id="thread-composer-input"
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              aria-label="Message input"
              aria-describedby="composer-help"
              className={cn(
                'w-full resize-none text-sm placeholder:text-muted-foreground',
                'max-h-[110px] min-h-[36px] px-3 py-2',
                'border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none',
                'focus:scroll-mb-40 md:scroll-mb-0',
                'overflow-y-auto outline-none'
              )}
            />
            <span id="composer-help" className="sr-only">
              Press Enter to send, Shift+Enter for new line
            </span>

            <div className="flex justify-between w-full px-2 pb-2">
              <div className="flex items-center gap-1">
                {showFileUpload && <div>{/* Add file upload component here if needed */}</div>}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="submit"
                  size="icon"
                  aria-label={loading ? 'Sending message...' : sendLabel}
                  disabled={loading || !message.trim() || disabled}
                  variant={message.trim() && !disabled ? 'default' : 'ghost'}
                  className="transition-color duration-200 ease-in-out"
                >
                  <Send size={16} aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
})
