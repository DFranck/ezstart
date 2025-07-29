'use client';

import { Icon, Tag } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function Footer() {
  const { isMobile } = useDevice();
  const t = useTranslations('footer');
  return (
    <Tag
      as='footer'
      data-component='footer'
      layout={'centered'}
      className={cn(isMobile && 'mb-10')}
      tabIndex={-1}
      withFixedMobilebar
    >
      <div className='flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center'>
        <span className='text-xs opacity-70 select-none'>
          {t('copyright', { year: new Date().getFullYear() })}
        </span>

        <Link href='/legal-notices' className='hover:underline text-xs'>
          {t('legalNotices')}
        </Link>
      </div>
      <div className='flex gap-3 items-center'>
        <Link
          href='https://github.com/DFranck/ez-start'
          target='_blank'
          rel='noopener noreferrer'
          aria-label='GitHub'
          className='hover:opacity-80'
        >
          <Icon name='fa:FaGithub' size={16} />
        </Link>
        <Link
          href='mailto:franckdufournet@hotmail.fr'
          className='hover:opacity-80'
          aria-label='Email'
        >
          <Icon name='fa:FaEnvelope' size={16} />
        </Link>
      </div>
    </Tag>
  );
}
