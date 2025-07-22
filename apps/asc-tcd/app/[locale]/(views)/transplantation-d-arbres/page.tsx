'use client';
import { Main } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';

const pageTransplantationArbres = () => {
  const { isDesktop } = useDevice();
  return (
    <Main withHeaderOffset className={cn({ 'mt-32': isDesktop })}>
      pageTransplantationArbres
    </Main>
  );
};

export default pageTransplantationArbres;
