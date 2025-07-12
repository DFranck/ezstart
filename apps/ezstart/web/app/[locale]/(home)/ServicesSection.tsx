'use client';

import { H2, H3, LI, P, Section, UL } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import { FC, HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement>;

type Service = {
  title: string;
  description: string;
};

const ServicesSection: FC<Props> = ({ className, ...rest }) => {
  const t = useTranslations('ServicesSection');

  const services = t.raw('services') as Service[];

  return (
    <Section className={className} {...rest} size='sm'>
      <H2>{t('title')}</H2>
      <P className='max-w-2xl'>{t('intro')}</P>

      <UL layout='grid' size={'xs'}>
        {services.map((service) => (
          <LI key={service.title} variant='card' layout={'col'} size='sm'>
            <H3 size={'h5'}>{service.title}</H3>
            <P variant={'description'} size={'xs'}>
              {service.description}
            </P>
          </LI>
        ))}
      </UL>
    </Section>
  );
};

export default ServicesSection;
