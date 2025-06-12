import { cva } from 'class-variance-authority';
import {
  align,
  intentContainer,
  intentText,
  layoutContainer,
  sizeContainer,
  sizeText,
  variantContainer,
  variantText,
} from '../../tokens/tokens';
import { createAlias } from '../../utils/create-alias';

// supported tags
export const listings = ['ul', 'ol', 'li', 'dl', 'dt', 'dd'] as const;
export const listingContainers = ['ul', 'ol', 'dl'] as const;
export const listingItems = ['li', 'dt', 'dd'] as const;

// base variant configs
const containerListVariantConfig = {
  variant: variantContainer,
  intent: intentContainer,
  size: sizeContainer,
  layout: layoutContainer,
  align: align,
};

const itemListVariantConfig = {
  variant: { ...variantContainer, ...variantText },
  intent: intentText,
  size: { ...sizeText, ...sizeContainer },
  align: align,
  button: {
    true: 'cursor-pointer hover:opacity-80 active:scale-95 transition-all duration-300',
    false: '',
  },
  marker: {
    default: '',
    check: 'before:content-["✅"] before:mr-2',
    arrow: 'before:content-["→"] before:mr-2',
    dash: 'before:content-["–"] before:mr-2',
  },
};

// variants
export const listingContainersVariants = {
  ul: cva('pl-4 space-y-1', {
    variants: containerListVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'lg',
      layout: 'col',
      align: 'left',
    },
  }),
};

export const listingItemsVariants = {
  li: cva('flex gap-2', {
    variants: itemListVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'xs',
      align: 'left',
      marker: 'default',
    },
  }),
};

// export combined
export const listingVariants = {
  ...listingContainersVariants,
  ...listingItemsVariants,
};

// aliases
export const Ul = createAlias('ul');
export const Li = createAlias('li');

// meta
function extractKeys<T extends Record<string, any>>(config: T): string[] {
  return Object.keys(config);
}

export const listingVariantsMeta = Object.fromEntries(
  listings.map((tag) => {
    const isContainer = listingContainers.includes(tag as any);
    const base = isContainer
      ? containerListVariantConfig
      : itemListVariantConfig;

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
