'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from '../icon';

type ConversationItemActionsProps = {
  conversationId: string;
  conversationTitle: string;
  onRename?: (id: string, newTitle: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
};

/**
 * Context menu for conversation actions (rename, delete)
 * Only visible when hover + actions provided
 */
export function ConversationItemActions({
  conversationId,
  conversationTitle,
  onRename,
  onDelete,
}: ConversationItemActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(conversationTitle);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasActions = onRename || onDelete;
  if (!hasActions) return null;

  // Close menu on click outside (anywhere on page)
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    // Add listener on next tick to avoid closing immediately
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleRename = async () => {
    if (onRename && editedTitle.trim() && editedTitle !== conversationTitle) {
      await onRename(conversationId, editedTitle.trim());
    }
    setIsEditing(false);
    setIsMenuOpen(false);
  };

  const handleDelete = async () => {
    if (onDelete && confirm('Delete this conversation?')) {
      await onDelete(conversationId);
    }
    setIsMenuOpen(false);
  };

  // Edit mode (inline input)
  if (isEditing) {
    return (
      <input
        type="text"
        value={editedTitle}
        onChange={(e) => setEditedTitle(e.target.value)}
        onBlur={handleRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleRename();
          if (e.key === 'Escape') {
            setEditedTitle(conversationTitle);
            setIsEditing(false);
          }
        }}
        autoFocus
        className="absolute inset-0 px-3 py-2 bg-background text-sm"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu Trigger - div instead of button to avoid nested button error */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
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

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop to close menu (kept for visual overlay) */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu content */}
          <div className="absolute right-0 top-8 z-20 w-48 rounded-md border bg-popover shadow-md">
            <div className="p-1">
              {onRename && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm rounded hover:bg-accent"
                >
                  <Icon name="lucide:Edit" size={14} className="mr-2" />
                  Rename
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
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
  );
}
