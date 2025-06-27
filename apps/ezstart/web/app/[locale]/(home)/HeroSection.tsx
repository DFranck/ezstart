import { AuroraBackground } from '@/components/ui/aurora-background';
import { H1, H3, H5, Section } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import { FC, HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement>;

export const HeroSection: FC<Props> = ({ className, ...rest }) => {
  const t = useTranslations('HeroSection');

  return (
    <AuroraBackground {...rest}>
      <Section className={className}>
        <H1 size='giant'>{t('title')}</H1>
        <H3>{t('subtitle')}</H3>
        <H5 variant='description' size='h6'>
          {t('description')}
        </H5>
      </Section>
    </AuroraBackground>
  );
};
