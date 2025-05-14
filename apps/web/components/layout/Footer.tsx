'use client';

import { useDevice } from '@/hooks/useDevice';
import { EzIcon } from '@ezstart/ez-icon';
import { cn } from '@workspace/ui/lib/utils';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function Footer() {
  const { isMobile } = useDevice();
  const t = useTranslations('footer');
  return (
    <footer
      className={cn(
        'border-t-2 px-6 py-4 text-center text-xs text-muted-foreground bg-background',
        { 'mb-10': isMobile }
      )}
    >
      <div className='flex flex-col items-center justify-center gap-2 md:flex-row md:justify-between max-w-5xl mx-auto'>
        <span>{t('copyright', { year: new Date().getFullYear() })}</span>

        <div className='flex gap-4'>
          <Link
            href='https://github.com/DFranck/ez-start'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline flex items-center gap-1'
          >
            <EzIcon name='Github' size={10} /> {t('github')}
          </Link>
          <Link href='/legal-notices' className='hover:underline'>
            {t('legalNotices')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
