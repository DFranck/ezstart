'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Li, Ul } from './tag';

export interface DropdownItem {
  label: string;
  value: string;
  onSelect?: () => void;
}

export interface DropdownProps {
  label: React.ReactNode;
  items: DropdownItem[];
  variant?:
    | 'default'
    | 'ghost'
    | 'secondary'
    | 'outline'
    | 'destructive'
    | 'link'
    | null;
}

export function Dropdown({ label, items, variant = 'ghost' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const menuId = 'dropdown-menu';

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => (i === null ? 0 : (i + 1) % items.length));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) =>
          i === null ? items.length - 1 : (i - 1 + items.length) % items.length
        );
      }

      if (e.key === 'Enter' && focusedIndex != null) {
        const item = items[focusedIndex];
        item?.onSelect?.();
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, items, focusedIndex]);

  // Manage focus when menu opens
  useEffect(() => {
    if (open) {
      setFocusedIndex(null);
    }
  }, [open]);

  return (
    <div ref={containerRef} className='relative inline-block text-left'>
      <Button
        variant={variant}
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className='w-full'
        aria-haspopup='menu'
        aria-expanded={open}
        aria-controls={menuId}
      >
        {label}
      </Button>

      {open && (
        <Ul
          id={menuId}
          role='menu'
          ref={menuRef}
          variant={'outline'}
          className='absolute right-0 z-50 min-w-[8rem] focus:outline-none bg-background p-1 space-y-1'
        >
          {items.map(({ label, onSelect, value }, i) => (
            <Button
              key={value}
              variant={'ghost'}
              asChild
              className='w-full justify-start'
              role='menuitem'
              size={'sm'}
              onClick={() => {
                onSelect?.();
                setOpen(false);
              }}
              tabIndex={-1}
            >
              <Li>{label}</Li>
            </Button>
          ))}
        </Ul>
      )}
    </div>
  );
}
