import { AuroraBackground } from '@/components/ui/aurora-background';
import { H1, H3, Section } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
export const SectionHero = () => {
  const t = useTranslations('hero');
  return (
    <AuroraBackground>
      <Section size={'md'}>
        <H1>{t('title')}</H1>
        <H3>{t('subtitle')}</H3>
      </Section>
    </AuroraBackground>
  );
};
