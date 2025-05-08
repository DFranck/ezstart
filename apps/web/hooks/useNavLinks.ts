'use client';

import { useMessages } from 'next-intl';

export type NavLink = {
  label: string;
  href: string;
};

export const useNavLinks = (): NavLink[] => {
  const messages = useMessages() as Record<string, any>;
  return Array.isArray(messages.links) ? messages.links : [];
};
