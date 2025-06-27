'use client';

import { H2, LI, Section, UL } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import { FC, HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement>;

const ExpertiseSection: FC<Props> = ({ className, ...rest }) => {
  const t = useTranslations('ExpertiseSection');

  const items = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6'] as const;

  return (
    <Section className={className} {...rest}>
      <H2>{t('title')}</H2>
      <UL layout='grid' size={'xs'}>
        {items.map((key) => (
          <LI key={key} variant='card' size='sm'>
            {t(key)}
          </LI>
        ))}
      </UL>
    </Section>
  );
};

export default ExpertiseSection;
