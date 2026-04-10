'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Icon } from '../icon';
import { paddingY, gap, fontSize } from '../../lib/design-system/tokens';
import { DesignTokenProvider, useDesignTokens } from '../../lib/design-system/DesignTokenContext';

type AccordionProps = React.ComponentProps<typeof AccordionPrimitive.Root> & {
  /** Design token: density propagated to children */
  density?: 'compact' | 'default' | 'relaxed'
  /** Design token: size propagated to children */
  size?: string
}

function Accordion({ density, size, ...props }: AccordionProps) {
  return (
    <DesignTokenProvider density={density} size={size}>
      <AccordionPrimitive.Root data-slot='accordion' {...props} />
    </DesignTokenProvider>
  );
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot='accordion-item'
      className={cn('border-b last:border-b-0', className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  const inherited = useDesignTokens();
  const density = (inherited.density ?? 'default') as 'compact' | 'default' | 'relaxed';

  const densityPadding = {
    compact: paddingY.sm,
    default: paddingY.lg,
    relaxed: paddingY.xl,
  };
  const densityGap = {
    compact: gap.tight,
    default: gap.relaxed,
    relaxed: gap.relaxed,
  };

  return (
    <AccordionPrimitive.Header className='flex'>
      <AccordionPrimitive.Trigger
        data-slot='accordion-trigger'
        className={cn(
          'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between rounded-md text-left font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
          densityPadding[density] ?? paddingY.lg,
          densityGap[density] ?? gap.relaxed,
          fontSize.base, // text-base sm:text-sm
          className
        )}
        {...props}
      >
        {children}
        <Icon
          name='lucide:ChevronDown'
          className='text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200'
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot='accordion-content'
      className={cn(
        'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden',
        fontSize.base // text-base sm:text-sm
      )}
      {...props}
    >
      <div className={cn('pt-0', paddingY.lg, className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
