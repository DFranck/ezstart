import { featureMeta } from '@/app/[locale]/(views)/ez-features/[feature]/meta/feature-meta';
import { libMeta } from '@/app/[locale]/(views)/ez-libs/[lib]/meta/lib-meta';

export const meta = {
  lib: libMeta,
  feature: featureMeta,
} as const;

export type MetaType = keyof typeof meta;

export type AllMeta = typeof meta;
export type MetaId<T extends MetaType> = keyof AllMeta[T];
export type MetaItem<T extends MetaType> = AllMeta[T][keyof AllMeta[T]];

export function getMeta<T extends MetaType>(
  type: T,
  id: keyof AllMeta[T]
): MetaItem<T> {
  return meta[type][id];
}
