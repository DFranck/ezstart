'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { Icon } from '../icon'

type ConversationItemProps = {
  id: string
  title: string
  preview?: string
  timestamp?: Date
  unread?: boolean
  isActive: boolean
  onSelect: (id: string) => void
  onRename?: (id: string, newTitle: string) => void | Promise<void>
  onDelete?: (id: string) => void | Promise<void>
  formatTimestamp: (date?: Date) => string
}

export function ConversationItem({
  id,
  title,
  preview,
  timestamp,
  unread,
  isActive,
  onSelect,
  onRename,
  onDelete,
  formatTimestamp,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Close menu on click outside
  useEffect(() => {
    if (!isMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleRename = async () => {
    if (onRename && editedTitle.trim() && editedTitle !== title) {
      await onRename(id, editedTitle.trim())
    } else {
      setEditedTitle(title) // Reset if no change
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (onDelete && confirm('Delete this conversation?')) {
      await onDelete(id)
    }
    setIsMenuOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setEditedTitle(title)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={cn(
        'relative group',
        'w-full rounded-lg transition-colors',
        'hover:bg-accent',
        isActive && 'bg-accent'
      )}
    >
      <button
        onClick={() => !isEditing && onSelect(id)}
        aria-current={isActive ? 'page' : undefined}
        aria-label={`${title}${unread ? ' (unread)' : ''}`}
        className={cn(
          'w-full text-left p-3 pr-10',
          unread && 'font-semibold',
          isEditing && 'cursor-default'
        )}
        disabled={isEditing}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Title as editable input */}
              <input
                ref={inputRef}
                type="text"
                value={isEditing ? editedTitle : title}
                onChange={e => setEditedTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                disabled={!isEditing}
                className={cn(
                  'text-sm font-medium truncate w-full',
                  'bg-transparent border-none outline-none',
                  !isEditing && 'pointer-events-none', // Disable clicks when not editing
                  isEditing && 'cursor-text bg-background px-2 py-0.5 rounded border border-primary'
                )}
                onClick={e => {
                  if (isEditing) {
                    e.stopPropagation()
                  }
                }}
              />
              {unread && (
                <span
                  className="w-2 h-2 bg-primary rounded-full flex-shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>
            {preview && <p className="text-xs text-muted-foreground truncate mt-1">{preview}</p>}
          </div>
          <div className="flex items-center gap-1">
            {timestamp && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatTimestamp(timestamp)}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Actions menu */}
      {(onRename || onDelete) && !isEditing && (
        <div className="absolute right-3 top-3 z-10" ref={menuRef}>
          <div
            role="button"
            tabIndex={0}
            onClick={e => {
              e.stopPropagation()
              setIsMenuOpen(!isMenuOpen)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                setIsMenuOpen(!isMenuOpen)
              }
            }}
            className={cn(
              'p-1 rounded hover:bg-accent/50 transition-opacity cursor-pointer',
              'opacity-0 group-hover:opacity-100',
              isMenuOpen && 'opacity-100'
            )}
            aria-label="More actions"
          >
            <Icon name="lucide:MoreVertical" size={16} />
          </div>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-48 rounded-md border bg-popover shadow-md">
                <div className="p-1">
                  {onRename && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setIsEditing(true)
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm rounded hover:bg-accent"
                    >
                      <Icon name="lucide:Edit" size={14} className="mr-2" />
                      Rename
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleDelete()
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm rounded hover:bg-destructive/10 text-destructive"
                    >
                      <Icon name="lucide:Trash2" size={14} className="mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
