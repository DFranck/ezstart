// ez-libs/ez-tag/components/Dropdown.tsx
import { Button, Div, EzTag, Li, Ul } from '@ezstart/ez-tag';
import React, { useEffect, useRef, useState } from 'react';

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

  // Fermer quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <Div ref={containerRef} className='relative inline-block text-left'>
      <EzTag
        as='button'
        variant={variant}
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-haspopup='menu'
        aria-expanded={open}
      >
        {label}
      </EzTag>

      {open && (
        <Ul
          role='menu'
          variant={'menu'}
          className='absolute right-0 mt-2 bg-popover text-popover-foreground data-[side=top]:bottom-1 data-[side=right]:left-0 data-[side=bottom]:top-1 data-[side=left]:right-0 z-50 min-w-[8rem] overflow-hidden '
        >
          {items.map(({ label, onSelect, value }) => (
            <Button asChild key={value} variant='ghost'>
              <Li
                role='menuitem'
                onClick={() => {
                  onSelect?.();
                  setOpen(false);
                }}
              >
                {label}
              </Li>
            </Button>
          ))}
        </Ul>
      )}
    </Div>
  );
}
