'use client';

import { H2, LI, P, Section, UL } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';

export const SectionVision = () => {
  const t = useTranslations('vision');

  return (
    <Section>
      <H2>{t('title')}</H2>
      <P>{t('intro')}</P>
      <UL layout={'grid'} size={'xs'}>
        {t.raw('points').map((point: string, index: number) => (
          <LI marker={'check'} variant={'card'} size={'sm'} key={index}>
            {point}
          </LI>
        ))}
      </UL>
      <P>{t('footer')}</P>
    </Section>
  );
};
