'use client';

import { LampContainer } from '@/components/lamp';
import { EzTag } from '@ezstart/ez-tag';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const SectionContact = () => {
  const t = useTranslations('section-contact');

  return (
    <EzTag as='section' size={'lg'}>
      <LampContainer>
        <EzTag as='h2'>{t('title')}</EzTag>

        <p className='text-muted-foreground text-lg'>{t('description')}</p>

        <div className='flex justify-center gap-4 mt-6 flex-wrap'>
          <EzTag as='button'>
            <Link href='/contact'>{t('cta')}</Link>
          </EzTag>
          <EzTag as='button'>
            <Link
              href='https://github.com/DFranck/ez-start'
              target='_blank'
              rel='noopener noreferrer'
            >
              {t('github')}
            </Link>
          </EzTag>
        </div>
      </LampContainer>
    </EzTag>
  );
};
