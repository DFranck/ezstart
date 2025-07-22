'use client';
import { Main } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';

const pageConsulting = () => {
  const { isDesktop } = useDevice();
  return (
    <Main withHeaderOffset className={cn({ 'mt-32': isDesktop })}>
      pageConsulting
    </Main>
  );
};

export default pageConsulting;
