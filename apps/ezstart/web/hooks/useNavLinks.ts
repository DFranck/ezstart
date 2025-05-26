'use client';

import { useMessages } from 'next-intl';

export type NavMenu = {
  menuLabel: string;
  menu: { label: string; href: string }[];
};
export type NavLink = { label: string; href: string };
export type NavItem = NavLink | NavMenu;

export const useNavLinks = (): NavItem[] => {
  const messages = useMessages() as Record<string, any>;
  return Array.isArray(messages.links) ? messages.links : [];
};
