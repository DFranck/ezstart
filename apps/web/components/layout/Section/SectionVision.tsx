'use client';

import { EzIcon } from '@ezstart/ez-icon';
import { H2, Li, P, Section } from '@ezstart/ez-tag';
import { useTranslations } from 'next-intl';
import { Ul } from '../../../../../packages/libs/ez-tag/src';

export const SectionVision = () => {
  const t = useTranslations('vision');

  return (
    <Section size={'lg'}>
      <H2>{t('title')}</H2>

      <P>{t('intro')}</P>

      <Ul layout={'grid'}>
        {t.raw('points').map((point: string, index: number) => (
          <Li variant={'card'} key={index}>
            <EzIcon
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
