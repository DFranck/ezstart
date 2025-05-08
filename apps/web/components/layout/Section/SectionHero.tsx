import { EzTag } from '@ezstart/ez-tag';
import { AuroraBackground } from '@workspace/ui/components/aurora-background';
import { useTranslations } from 'next-intl';
export const SectionHero = () => {
  const t = useTranslations('hero');
  return (
    <>
      <AuroraBackground className=''>
        <EzTag as='section' className='z-10 text-foreground'>
          <EzTag as='h1'>{t('title')}</EzTag>
          <EzTag as='h2'>{t('subtitle')}</EzTag>
        </EzTag>
      </AuroraBackground>
    </>
  );
};
