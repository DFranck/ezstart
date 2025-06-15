'use client';

import { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Tag } from './tag';

type NavProps = {
  children?: ReactNode;
  className?: string;
};

export const Nav = ({ children, className }: NavProps) => {
  const debug = false;

  if (children) {
    return (
      <Tag
        as='nav'
        layout={'center'}
        className={cn('', className, debug && 'bg-red-500')}
      >
        {children}
      </Tag>
    );
  }

  return <nav />;
};
