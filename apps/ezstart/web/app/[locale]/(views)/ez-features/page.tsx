'use client';
import { FeatureItem } from '@/types/feature';
import { getTranslationArray } from '@/utils/get-translation-array';
import { H1, Main, Section } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import { FeatureSection } from './[feature]/components/section-feature';

export default function EzFeaturesPage() {
  const t = useTranslations('features');
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
