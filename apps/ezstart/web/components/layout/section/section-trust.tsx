'use client';

import { useExternalStats } from '@/hooks/useExternalStats';
import { H2, Icon, LI, P, Section, UL } from '@ezstart/ui/components';
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
    <Section>
      <H2>{t('title')}</H2>
      <P>{t('intro')}</P>
      <UL layout={'grid'}>
        {points.map((point, index) => (
          <LI key={index} variant={'card'} className='flex-col items-center'>
            <P>{point.icon}</P>
            <P className='font-semibold text-lg'>
              {isLoading ? (
                <Icon name='lucide:Loader' size={20} spin />
              ) : (
                formatValue(point.value)
              )}
            </P>
            <P>{point.label}</P>
          </LI>
        ))}
      </UL>

      <P>{t('footer')}</P>
    </Section>
  );
};
