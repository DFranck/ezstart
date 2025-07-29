'use client';

import ContactsList from '@/components/contactsList';
import { LampContainer } from '@/components/ui/lamp';
import { H2, P } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import { FC, HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement>;

const ContactSection: FC<Props> = ({ className, ...rest }) => {
  const t = useTranslations('contact');

  return (
    <LampContainer className={` ${className ?? ''}`} {...rest}>
      <H2 className='md:text-center'>{t('subtitle')}</H2>
      <P>{t('description')}</P>
      <ContactsList className='justify-center' />
    </LampContainer>
  );
};

export default ContactSection;
