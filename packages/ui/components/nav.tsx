'use client';

import { ReactNode } from 'react';
import { Tag } from './tag';

type NavProps = {
  children?: ReactNode;
};

export const Nav = ({ children }: NavProps) => {
  if (children) {
    return (
      <Tag as='nav' className='flex gap-4'>
        {children}
      </Tag>
    );
  }

  return <nav />;
};
