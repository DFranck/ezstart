import { FeatureItem } from '@/types/feature';
import { getTranslationArray } from '@/utils/get-translation-array';
import { H1, Main, Section } from '@ezstart/ui/components';
import { getTranslations } from 'next-intl/server';
import { FeatureSection } from './[feature]/components/section-feature';

export default async function EzFeaturesPage() {
  const t = await getTranslations('features');
  const features = getTranslationArray<FeatureItem>(t, 'items');

  return (
    <Main withHeaderOffset>
      <Section>
        <H1>{t('title')}</H1>
      </Section>
      {features.map((feature, index) => (
        <FeatureSection key={feature.title} feature={feature} />
      ))}
    </Main>
  );
}
