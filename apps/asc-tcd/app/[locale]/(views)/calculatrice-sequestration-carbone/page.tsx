'use client';
import { Main } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';

const pageCalculatrice = () => {
  const { isDesktop } = useDevice();
  return (
    <Main withHeaderOffset className={cn({ 'mt-32': isDesktop })}>
      pageCalculatrice
    </Main>
  );
};

export default pageCalculatrice;
