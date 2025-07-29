import { ItemLinks } from './item';

export type LibraryContentLink = {
  title: string;
  url: string;
};

export type LibrarySpecificContent = {
  title?: string;
  subtitle?: string;
  description?: string;
  notFound: string;
  items?: LibraryContentLink[];
};

export type LibraryItem = {
  title: string;
  subtitle: string;
  roles?: string[];
  description: string;
  links: ItemLinks;
  src: string;
  tech: string[];
  content?: LibrarySpecificContent;
};
