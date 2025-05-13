// ez-tag/src/styles/index.ts
import { ALL_LAYOUT_TAGS, LayoutTag } from '../types/supported-tags';
import { EzTagDefaultVariants } from './default-variants';
import { EzTagThemedVariants } from './themed-variants';

export const EzTagVariants: Record<
  LayoutTag,
  Record<string, string>
> = {} as any;

// 🟩 Étape 1 : peupler
ALL_LAYOUT_TAGS.forEach((tag) => {
  const defaultClass = EzTagDefaultVariants[tag] ?? '';
  const themed = EzTagThemedVariants[tag] ?? {};
  EzTagVariants[tag] = {
    default: defaultClass,
    ...themed,
  };
});

// ✅ Étape 2 : vérifier
ALL_LAYOUT_TAGS.forEach((tag) => {
  if (!EzTagVariants[tag]) {
    throw new Error(`[EzTagVariants] Missing variant mapping for <${tag}>`);
  }
  if (!EzTagVariants[tag].default) {
    console.warn(`[EzTagVariants] No default class for <${tag}>`);
  }
});

export type VariantKey<T extends LayoutTag> = keyof (typeof EzTagVariants)[T];
