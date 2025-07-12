'use client';
import { Main } from '@ezstart/ui/components';
import { useEffect, useRef, useState } from 'react';
import { HeaderLib } from '../components/header-lib';

const EzIconPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const asideRef = useRef<HTMLDivElement>(null);

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
