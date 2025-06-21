'use client';

import { H2, P, Section } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const SectionAbout = () => {
  const t = useTranslations('SectionAbout');
  console.log(t('paragraph1'));
  return (
    <Section id='about'>
      <H2>{t('title')}</H2>

      <P className='text-center'>
        {t.rich('paragraph1', {
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </P>
      <P className='text-center'>{t('paragraph2')}</P>

      <Link
        href='/about'
        className='inline-block mt-4 text-cyan-600 hover:underline'
      >
        {t('cta')}
      </Link>
    </Section>
  );
};

export default SectionAbout;
