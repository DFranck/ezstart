import React from 'react';
import { cn } from '../lib/utils';

export const gradientColors = [
  'primary',
  'secondary',
  'accent',
  'muted',
  'success',
  'warning',
  'info',
  'destructive',
  'ring',
  'ezstart',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
] as const;

export type GradientColor = (typeof gradientColors)[number];
type Props = {
  from?: GradientColor;
  to?: GradientColor;
  speed?: number;
  children: React.ReactNode;
  className?: string;
};

export const TextGradient = ({
  from = 'primary',
  to = 'primary',
  children,
  className,
  speed,
}: Props) => {
  return (
    <span
      className={cn('text-gradient', className)}
      style={
        {
          '--text-gradient-from': `var(--${from})`,
          '--text-gradient-via': `var(--${to})`,
          '--text-gradient-to': `var(--${from})`,
          ...(speed ? { '--gradient-speed': `${speed}s` } : {}),
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
};
