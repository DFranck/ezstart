'use client';

import EzTag from '@ezstart/ez-tag';
import { cn } from '@workspace/ui/lib/utils';
import { useTranslations } from 'next-intl';

export const SectionVision = () => {
  const t = useTranslations('vision');

  return (
    <EzTag as='section' id='vision' className={cn('py-20 px-6 text-center')}>
      <EzTag as='div' className='max-w-3xl mx-auto space-y-6'>
        <EzTag
          as='h2'
          className='text-3xl md:text-4xl font-bold tracking-tight'
        >
          {t('title')}
        </EzTag>

        <EzTag as='p' className='text-lg text-muted-foreground'>
          {t('intro')}
        </EzTag>

        <ul className='grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-sm md:text-base'>
          {t.raw('points').map((point: string, index: number) => (
            <li key={index} className='bg-muted p-4 rounded-lg shadow'>
              ✅ {point}
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
