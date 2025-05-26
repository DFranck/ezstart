import { cva } from 'class-variance-authority';
import { containerIntents, textIntents } from '../../tokens/Intents';
import { containerSizeVariants, textSizeVariants } from '../../tokens/size';
import { containerVariants, textVariants } from '../../tokens/variants';
import { createAlias } from '../../utils/create-alias';

// supported tags
export const listings = ['ul', 'ol', 'li', 'dl', 'dt', 'dd'] as const;
export const listingContainers = ['ul', 'ol', 'dl'] as const;
export const listingItems = ['li', 'dt', 'dd'] as const;

// common base
export const baseListClasses = 'text-base text-muted-foreground';

// variants
export const listingContainersVariants = {
  ul: cva('list-disc pl-4 space-y-1', {
    variants: {
      variant: containerVariants,
      intent: containerIntents,
      size: containerSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
    },
  }),
  ol: cva('list-decimal pl-4 space-y-1', {
    variants: {
      variant: containerVariants,
      intent: containerIntents,
      size: containerSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
    },
  }),
  dl: cva('grid grid-cols-[auto,1fr] gap-x-2 gap-y-1', {
    variants: {
      variant: containerVariants,
      intent: containerIntents,
      size: containerSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
    },
  }),
};

export const listingItemsVariants = {
  li: cva('', {
    variants: {
      variant: textVariants,
      intent: textIntents,
      size: textSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
    },
  }),

  dt: cva('font-semibold', {
    variants: {
      variant: textVariants,
      intent: textIntents,
      size: textSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
    },
  }),
  dd: cva('', {
    variants: {
      variant: textVariants,
      intent: textIntents,
      size: textSizeVariants,
    },
    defaultVariants: {
      variant: 'default',
      intent: 'default',
      size: 'default',
    },
  }),
};

export const listingVariants = {
  ...listingContainersVariants,
  ...listingItemsVariants,
};

// aliases
export const UL = createAlias('ul');
export const OL = createAlias('ol');
export const LI = createAlias('li');
export const DL = createAlias('dl');
export const DT = createAlias('dt');
export const DD = createAlias('dd');

// meta
export const listingVariantsMeta = {
  ...Object.fromEntries(
    ['ul', 'ol', 'dl'].map((tag) => [
      tag,
      {
        variant: Object.keys(containerVariants),
        intent: Object.keys(containerIntents),
        size: Object.keys(containerSizeVariants),
      },
    ])
  ),
  ...Object.fromEntries(
    ['li', 'dt', 'dd'].map((tag) => [
      tag,
      {
        variant: Object.keys(textVariants),
        intent: Object.keys(textIntents),
        size: Object.keys(textSizeVariants),
      },
    ])
  ),
} as Record<
  keyof typeof listingVariants,
  { variant: string[]; intent: string[]; size: string[] }
>;
