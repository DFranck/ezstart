import { cva } from 'class-variance-authority';
import { containerIntents } from '../../tokens/Intents';
import { containerSizeVariants, textSizeVariants } from '../../tokens/size';
import { containerVariants, textVariants } from '../../tokens/variants';
import { createAlias } from '../../utils/create-alias';

// supported tags
export const listings = ['ul', 'ol', 'li', 'dl', 'dt', 'dd'] as const;
export const listingContainers = ['ul', 'ol', 'dl'] as const;
export const listingItems = ['li', 'dt', 'dd'] as const;

// base variant configs
const containerListVariantConfig = {
  variant: containerVariants,
  intent: containerIntents,
  size: containerSizeVariants,
  layout: {
    default: 'flex flex-col gap-2',
    inline: 'flex flex-row flex-wrap gap-4',
    grid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    stacked: 'space-y-2',
  },
};

const itemListVariantConfig = {
  variant: { ...containerVariants, ...textVariants },
  intent: containerIntents,
  size: textSizeVariants,
  align: {
    center: 'items-center justify-center text-center',
    left: 'items-start justify-start text-left',
  },
  wrap: {
    wrap: 'flex flex-wrap justify-center gap-2',
    inline: 'inline-block',
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
      size: 'xs',
      layout: 'default',
    },
  }),
  ol: cva('list-decimal pl-4 space-y-1', {
    variants: containerListVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'xs',
      layout: 'default',
    },
  }),
  dl: cva('grid grid-cols-[auto,1fr] gap-x-2 gap-y-1', {
    variants: containerListVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'xs',
      layout: 'default',
    },
  }),
};

export const listingItemsVariants = {
  li: cva('flex gap-2', {
    variants: itemListVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
      align: 'left',
      marker: 'default',
    },
  }),
  dt: cva('font-semibold', {
    variants: itemListVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
      align: 'left',
      marker: 'default',
    },
  }),
  dd: cva('', {
    variants: itemListVariantConfig,
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
      align: 'left',
      marker: 'default',
      wrap: 'inline',
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
export const Ol = createAlias('ol');
export const Li = createAlias('li');
export const Dl = createAlias('dl');
export const Dt = createAlias('dt');
export const Dd = createAlias('dd');

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
