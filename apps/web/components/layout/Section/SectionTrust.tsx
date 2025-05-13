'use client';

import { useExternalStats } from '@/hooks/useExternalStats';
import { H2, Li, P, Section, Ul } from '@ezstart/ez-tag';
import { useTranslations } from 'next-intl';

type TrustPoint = {
  icon: string;
  label: string;
  value: string;
};

export const SectionTrust = () => {
  const t = useTranslations('trust');
  const { stats, isLoading } = useExternalStats();

  const points = t.raw('points') as TrustPoint[];

  const formatValue = (val: string) =>
    val
      .replace('{stars}', stats.stars?.toString() ?? '0')
      .replace('{downloads}', stats.downloads?.toString() ?? '0');

  return (
    <Section size={'lg'} className='z-10'>
      <H2>{t('title')}</H2>

      <P>{t('intro')}</P>

      <Ul layout={'grid'} className='sm:grid-cols-2 md:grid-cols-3'>
        {points.map((point, index) => (
          <Li key={index} variant={'card'} className='flex-col items-center'>
            <P>{point.icon}</P>
            <P className='font-semibold text-lg'>
              {isLoading ? '...' : formatValue(point.value)}
            </P>
            <P variant={'muted'}>{point.label}</P>
          </Li>
        ))}
      </Ul>

      <P>{t('footer')}</P>
    </Section>
  );
};
