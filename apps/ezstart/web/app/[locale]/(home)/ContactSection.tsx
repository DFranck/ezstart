'use client';

import { LampContainer } from '@/components/ui/lamp';
import { H2, P } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import { FC, HTMLAttributes } from 'react';
import ContactsList from '../(views)/(statics)/contact/components/contactsList';

type Props = HTMLAttributes<HTMLElement>;

const ContactSection: FC<Props> = ({ className, ...rest }) => {
  const t = useTranslations('ContactSection');

  return (
    <LampContainer className={` ${className ?? ''}`} {...rest}>
      <H2 className='md:text-center'>{t('title')}</H2>
      <P>{t('description')}</P>
      <ContactsList className='justify-center' />
    </LampContainer>
  );
};

export default ContactSection;
