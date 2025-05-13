'use client';

import { EzTag } from '@ezstart/ez-tag';
import { useTranslations } from 'next-intl';

export const SectionVision = () => {
  const t = useTranslations('vision');

  return (
    <EzTag as='section' size={'lg'}>
      <EzTag as='h2'>{t('title')}</EzTag>

      <p className='text-lg text-muted-foreground'>{t('intro')}</p>

      <ul className='grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-sm md:text-base'>
        {t.raw('points').map((point: string, index: number) => (
          <li key={index} className='bg-muted p-4 rounded-lg shadow'>
            ✅ {point}
          </li>
        ))}
      </ul>

      <p className='text-muted-foreground italic'>{t('footer')}</p>
    </EzTag>
  );
};
