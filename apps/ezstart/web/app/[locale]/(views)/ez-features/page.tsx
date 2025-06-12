'use client';
import { H1, Main, Section } from '@ezstart/ui/components';
import { FeatureSection } from './[feature]/components/section-feature';
import { featureMeta } from './[feature]/meta/feature-meta';
import { FeatureId, FeatureMeta } from './[feature]/types';

export default function EzFeaturesPage() {
  return (
    <Main withHeaderOffset>
      <Section>
        <H1>EzFeatures</H1>
      </Section>
      {(Object.entries(featureMeta) as [FeatureId, FeatureMeta][]).map(
        ([featureId]) => (
          <FeatureSection key={featureId} featureId={featureId} />
        )
      )}
    </Main>
  );
}
