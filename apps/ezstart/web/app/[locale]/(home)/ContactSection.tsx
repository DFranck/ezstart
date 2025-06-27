'use client';

import { LampContainer } from '@/components/ui/lamp';
import { Button, Div, H2, P } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { FC, HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement>;

const ContactSection: FC<Props> = ({ className, ...rest }) => {
  const t = useTranslations('ContactSection');

  return (
    <LampContainer className={` ${className ?? ''}`} {...rest}>
      <Div>
        <H2>{t('title')}</H2>
        <P>{t('description')}</P>
        <Div layout={'row'} size={'sm'}>
          <Link href='mailto:franck.dufournet@gmail.com'>
            <Button>{t('ctaEmail')}</Button>
          </Link>
          <Link
            href='https://www.linkedin.com/in/franck-dufournet-239446151/'
            target='_blank'
            rel='noopener noreferrer'
          >
            <Button variant='ghost'>{t('ctaLinkedIn')}</Button>
          </Link>
          <Link href='/contact'>
            <Button variant='outline'>{t('ctaMore')}</Button>
          </Link>
        </Div>
      </Div>
    </LampContainer>
  );
};

export default ContactSection;
