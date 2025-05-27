'use client';

import { H2, Li, P, Section, Ul } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';

export const SectionVision = () => {
  const t = useTranslations('vision');

  return (
    <Section>
      <H2>{t('title')}</H2>
      <P>{t('intro')}</P>
      <Ul layout={'grid'} size={'full'}>
        {t.raw('points').map((point: string, index: number) => (
          <Li marker={'check'} variant={'card'} key={index}>
            {point}
          </Li>
        ))}
      </Ul>
      <P size={'sm'}>{t('footer')}</P>
    </Section>
  );
};
