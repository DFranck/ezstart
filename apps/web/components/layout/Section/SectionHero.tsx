import { AuroraBackground } from '@/components/aurora-background';
import EzTag from '@ezstart/ez-tag';
import { useTranslations } from 'next-intl';
export const SectionHero = () => {
  const t = useTranslations('hero');
  return (
    <>
      <AuroraBackground className=''>
        <EzTag as='section' className='z-10 '>
          <EzTag as='h1'>{t('title')}</EzTag>
          <EzTag as='h2'>{t('subtitle')}</EzTag>
        </EzTag>
      </AuroraBackground>
    </>
  );
};
