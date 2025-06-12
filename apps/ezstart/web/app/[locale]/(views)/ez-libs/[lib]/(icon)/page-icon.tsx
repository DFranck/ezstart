'use client';
import {
  customIconMap,
  faIcons,
  lucideIcons,
  Main,
} from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { useEffect, useRef, useState } from 'react';
import { HeaderLib } from '../components/header-lib';

const allIcons = [
  ...lucideIcons.map((name) => ({ lib: 'lucide', name })),
  ...faIcons.map((name) => ({ lib: 'fa', name })),
  ...Object.keys(customIconMap).map((name) => ({ lib: 'custom', name })),
];

const EzIconPage = () => {
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
    <Main withHeaderOffset>
      <HeaderLib lib='ezicon' />
    </Main>
  );
};
export default EzIconPage;
