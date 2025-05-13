'use client';

import { useExternalStats } from '@/hooks/useExternalStats';
import EzTag from '@ezstart/ez-tag';
import { cn } from '@workspace/ui/lib/utils';
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
    <EzTag as='section' id='trust' className={cn('py-20 px-6 text-center')}>
      <EzTag as='div' className='max-w-4xl mx-auto space-y-6'>
        <EzTag
          as='h2'
          className='text-3xl md:text-4xl font-bold tracking-tight'
        >
          {t('title')}
        </EzTag>

        <EzTag as='p' className='text-lg text-muted-foreground'>
          {t('intro')}
        </EzTag>

        <ul className='grid grid-cols-2 md:grid-cols-3 gap-6 text-left text-sm md:text-base'>
          {points.map((point, index) => (
            <li
              key={index}
              className='bg-background p-4 rounded-xl shadow text-center space-y-2'
            >
              <div className='text-2xl'>{point.icon}</div>
              <p className='font-semibold text-lg'>
                {isLoading ? '...' : formatValue(point.value)}
              </p>
              <p className='text-muted-foreground text-xs'>{point.label}</p>
            </li>
          ))}
        </ul>

        <EzTag as='p' className='text-muted-foreground italic'>
          {t('footer')}
        </EzTag>
      </EzTag>
    </EzTag>
  );
};
