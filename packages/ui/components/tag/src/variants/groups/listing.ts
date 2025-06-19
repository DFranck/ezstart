// Path: ez-libs/ez-tag/components/listingVariants.ts

import { cva } from 'class-variance-authority';
import {
  intentContainer,
  intentText,
  variantContainer,
  variantText,
} from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

// --- Tags
export const LISTING_CONTAINERS = ['ul'] as const;
export const LISTING_ITEMS = ['li'] as const;
export const LISTING_TAGS = [...LISTING_CONTAINERS, ...LISTING_ITEMS] as const;

// --- Variants tokens
export const listingContainersVariant = variantContainer;
export const listingItemsVariant = variantText;

export const listingContainersSize = {
  default: '',
  xs: 'px-2 py-4 md:px-4 md:py-6',
  sm: 'px-4 py-6 md:px-8 md:py-10',
  md: 'px-6 py-8 md:px-12 md:py-14',
  lg: 'px-8 py-12 md:px-16 md:py-20',
  xl: 'px-12 py-16 md:px-24 md:py-28',
} as const;

export const listingItemsSize = {
  default: '',
  xs: 'px-1 py-2',
  sm: 'px-2 py-3',
} as const;

export const listingContainersIntent = intentContainer;
export const listingItemsIntent = intentText;

export const listingContainersLayout = {
  default: '',
  col: 'flex flex-col',
  row: 'flex flex-row items-center',
  grid: 'grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2',
  center: 'flex flex-col items-center justify-center gap-4 md:gap-6 lg:gap-8',
  menu: 'flex flex-col py-1 md:py-1 px-2 md:px-2 gap-2 md:gap-4 lg:gap-6',
} as const;

// --- Variant config
export const listingContainersVariantConfig = {
  variant: listingContainersVariant,
  intent: listingContainersIntent,
  size: listingContainersSize,
  layout: listingContainersLayout,
} as const;

export const listingItemsVariantConfig = {
  variant: { ...listingItemsVariant, ...listingContainersVariant },
  intent: listingItemsIntent,
  size: listingItemsSize,
  layout: listingContainersLayout,
  button: {
    true: 'cursor-pointer hover:opacity-80 active:scale-95 transition-all duration-100',
    false: '',
  },
  marker: {
    default: '',
    check: 'before:content-["✅"] before:mr-2',
    arrow: 'before:content-["→"] before:mr-2',
    dash: 'before:content-["–"] before:mr-2',
  },
} as const;

// --- CVA
export const listingContainersVariants = {
  ul: cva('pl-4', {
    variants: listingContainersVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'lg',
      layout: 'col',
    },
  }),
};

export const listingItemsVariants = {
  li: cva('flex gap-2', {
    variants: listingItemsVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
      marker: 'default',
      layout: 'row',
      button: false,
    },
  }),
};

// --- Combined export
export const listingVariants = {
  ...listingContainersVariants,
  ...listingItemsVariants,
};

// --- Aliases
export const UL = createAlias('ul');
export const LI = createAlias('li');

// --- Meta for playground/devtools
function extractKeys<T extends Record<string, any>>(config: T): string[] {
  return Object.keys(config);
}

export const listingVariantsMeta = Object.fromEntries(
  LISTING_TAGS.map((tag) => {
    const isContainer = LISTING_CONTAINERS.includes(tag as any);
    const base = isContainer
      ? listingContainersVariantConfig
      : listingItemsVariantConfig;

    return [
      tag,
      Object.fromEntries(
        Object.keys(base).map((variantKey) => [
          variantKey,
          extractKeys(base[variantKey as keyof typeof base]),
        ])
      ),
    ];
  })
) as Record<string, Record<string, string[]>>;
