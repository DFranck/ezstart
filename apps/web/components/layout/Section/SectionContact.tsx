'use client';

import { LampContainer } from '@/components/lamp';
import { EzTag } from '@ezstart/ez-tag';
import { Button } from '@workspace/ui/components/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const SectionContact = () => {
  const t = useTranslations('contact');

  return (
    <EzTag as='section' id='contact' className='relative'>
      <LampContainer>
        <EzTag as='div' className='max-w-xl mx-auto text-center space-y-6'>
          <EzTag
            as='h2'
            className='text-3xl md:text-4xl font-bold tracking-tight'
          >
            {t('title')}
          </EzTag>

          <EzTag as='p' className='text-muted-foreground text-lg'>
            {t('description')}
          </EzTag>

          <div className='flex justify-center gap-4 mt-6 flex-wrap'>
            <Button asChild variant='default'>
              <Link href='/contact'>{t('cta')}</Link>
            </Button>
            <Button asChild variant='outline'>
              <Link
                href='https://github.com/DFranck/ez-start'
                target='_blank'
                rel='noopener noreferrer'
              >
                {t('github')}
              </Link>
            </Button>
          </div>
        </EzTag>
      </LampContainer>
    </EzTag>
  );
};
