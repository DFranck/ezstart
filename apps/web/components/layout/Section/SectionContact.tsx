'use client';

import { LampContainer } from '@/components/ui/lamp';
import { EzIcon } from '@ezstart/ez-icon';
import { Button, H2, P, Section, Ul } from '@ezstart/ez-tag';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const SectionContact = () => {
  const t = useTranslations('section-contact');

  return (
    <LampContainer>
      <Section className='items-center' size={'lg'}>
        <H2>{t('title')}</H2>

        <P>{t('description')}</P>

        <Ul layout={'inline'}>
          <Button>
            <Link href='/contact'>{t('cta')}</Link>
          </Button>
          <Button asChild variant={'outline'}>
            <Link
              href='https://github.com/DFranck/ez-start'
              target='_blank'
              rel='noopener noreferrer'
            >
              <EzIcon name='Github' size={20} />
              {t('github')}
            </Link>
          </Button>
        </Ul>
      </Section>
    </LampContainer>
  );
};
