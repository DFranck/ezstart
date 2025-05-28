import { featureMeta } from './meta/feature-meta';

export type FeatureId = keyof typeof featureMeta;

export type FeatureMeta = (typeof featureMeta)[FeatureId];
