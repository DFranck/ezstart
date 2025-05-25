'use client';

import { H2, Icon, Li, P, Section, Ul } from '@ezstart/ui';
import { useTranslations } from 'next-intl';

export const SectionVision = () => {
  const t = useTranslations('vision');

  return (
    <Section size={'lg'}>
      <H2>{t('title')}</H2>

      <P>{t('intro')}</P>

      <Ul layout={'grid'}>
        {t.raw('points').map((point: string, index: number) => (
          <Li variant={'card'} key={index}>
            <Icon
              name='lucide:CheckCircle'
              size={20}
              className='text-green-500'
            />
            {point}
          </Li>
        ))}
      </Ul>

      <P variant={'muted'} size={'sm'}>
        {t('footer')}
      </P>
    </Section>
  );
};
