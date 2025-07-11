'use client';
import { useNavLinks } from '@/hooks/useNavLinks';
import { Button, Icon } from '@ezstart/ui/components';
import Link from 'next/link';
import { useState } from 'react';
interface Props {
  variant?:
    | 'default'
    | 'ghost'
    | 'secondary'
    | 'outline'
    | 'destructive'
    | 'link';
  setIsOpen?: (isOpen: boolean) => void;
}

export function MobileNavMenu({ variant = 'link', setIsOpen }: Props) {
  const links = useNavLinks();
  // Stocke l'index du menu ouvert
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <nav className='flex flex-col gap-2 w-full'>
      {links.map((item, idx) =>
        'menu' in item ? (
          <div key={idx} className='w-full'>
            <Button
              type='button'
              variant={variant}
              onClick={() => handleToggle(idx)}
              aria-expanded={openIndex === idx}
              aria-controls={`submenu-${idx}`}
              className='w-full'
            >
              <span>{item.menuLabel}</span>
              {openIndex === idx ? (
                <Icon name='fa:FaChevronUp' size={18} />
              ) : (
                <Icon name='fa:FaChevronDown' size={18} />
              )}
            </Button>
            <div
              id={`submenu-${idx}`}
              className={`ml-2 flex flex-col gap-1 pl-2 border-l transition-all duration-300 overflow-hidden ${
                openIndex === idx ? 'max-h-40 py-2' : 'max-h-0 py-0'
              }`}
              style={{
                transition: 'max-height 0.3s, withHeaderOffset 0.3s',
              }}
            >
              {item.menu.map((sub) => (
                <Button
                  asChild
                  variant={'ghost'}
                  key={sub.href}
                  onClick={() => {
                    setOpenIndex(null);
                    setIsOpen?.(false);
                  }}
                >
                  <Link
                    href={sub.href}
                    className='py-1 px-2 rounded hover:bg-muted text-sm'
                  >
                    {sub.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <Button key={item.href} asChild variant={variant}>
            <Link
              href={item.href}
              className='py-2 px-2 rounded hover:bg-muted font-medium'
              onClick={() => {
                setOpenIndex(null);
                setIsOpen?.(false);
              }}
            >
              {item.label}
            </Link>
          </Button>
        )
      )}
    </nav>
  );
}
