'use client';

import { H2, P, Section } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { FC, HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement>;

const AboutSection: FC<Props> = ({ className, ...rest }) => {
  const t = useTranslations('AboutSection');

  return (
    <Section className={className} {...rest}>
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

export default AboutSection;
