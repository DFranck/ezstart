'use client';

import { H2, Li, P, Section } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';

export const SectionVision = () => {
  const t = useTranslations('vision');

  return (
    <Section>
      <H2>{t('title')}</H2>
      <P>{t('intro')}</P>
      <UL layout={'grid'} size={'full'}>
        {t.raw('points').map((point: string, index: number) => (
          <LImarker={'check'} variant={'card'} key={index}>
            {point}
          </LI>
        ))}
      </UL>
      <P size={'sm'}>{t('footer')}</P>
    </Section>
  );
};
