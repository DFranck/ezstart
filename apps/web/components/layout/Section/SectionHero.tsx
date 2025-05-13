import { AuroraBackground } from '@/components/aurora-background';
import { EzTag } from '@ezstart/ez-tag';
import { useTranslations } from 'next-intl';
export const SectionHero = () => {
  const t = useTranslations('hero');
  return (
    <>
      <AuroraBackground>
        <EzTag as='section' size={'lg'}>
          <EzTag as='h1'>{t('title')}</EzTag>
          <EzTag as='h3'>{t('subtitle')}</EzTag>
        </EzTag>
      </AuroraBackground>
    </>
  );
};
