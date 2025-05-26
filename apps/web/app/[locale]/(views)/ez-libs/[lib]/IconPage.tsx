'use client';
import { useDevice } from '@/hooks/useDevice';
import {
  Button,
  cn,
  customIconMap,
  Div,
  faIcons,
  lucideIcons,
  Main,
} from '@ezstart/ui';
import { useEffect, useRef, useState } from 'react';

const allIcons = [
  ...lucideIcons.map((name) => ({ lib: 'lucide', name })),
  ...faIcons.map((name) => ({ lib: 'fa', name })),
  ...Object.keys(customIconMap).map((name) => ({ lib: 'custom', name })),
];

const IconPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const asideRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useDevice();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        asideRef.current &&
        !asideRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <Div className='flex h-screen mt-[72px] '>
      {isMobile && (
        <Div className='fixed top-[72px] flex justify-between  border-b-2 border-t-2 w-full p-2'>
          <Button variant={'ghost'} onClick={() => setIsOpen((o) => !o)}>
            Menu
          </Button>
          <Button variant={'ghost'}>Return to top</Button>
        </Div>
      )}
      <aside
        ref={asideRef}
        className={cn('w-72 bg-muted transition-all duration-300 z-10', {
          '-translate-x-72 w-0': isMobile && !isOpen,
        })}
      >
        filter
      </aside>
      <Main className='relative mt-[56px]'>
        {/* <IconGallery
          title='All Icons'
          icons={allIcons as IconGalleryItem[]}
          height={400}

          // fullHeight
        /> */}
      </Main>
    </Div>
  );
};
export default IconPage;
