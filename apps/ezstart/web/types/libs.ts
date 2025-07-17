export type LibContentLink = {
  title: string;
  url: string;
};

export type LibContent = {
  title?: string;
  subtitle?: string;
  description?: string;
  notFound: string;
  items?: LibContentLink[];
};

export type LibraryLinks = {
  local: string;
  github?: string;
  npm?: string;
};

export type LibraryType = {
  title: string;
  subtitle: string;
  roles?: string[];
  description: string;
  links: LibraryLinks;
  src: string;
  tech: string[];
  content?: LibContent;
};
