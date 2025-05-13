import { LayoutTag } from '../types/supported-tags';

export const EzTagDefaultVariants: Record<LayoutTag, string> = {
  // ------------------------------------------------------------
  // Layout containers
  // ------------------------------------------------------------
  div: '',
  span: '',
  section: 'container mx-auto px-4 py-8',
  main: 'container mx-auto px-4 py-8 flex flex-col',
  header: 'w-full bg-white shadow-sm px-4 py-4',
  footer: 'w-full bg-gray-50 px-4 py-8 text-center text-sm text-gray-600',
  nav: 'flex items-center justify-between px-4 py-3 bg-gray-100',
  article: 'prose prose-lg mx-auto',
  aside: 'w-64',

  // ------------------------------------------------------------
  // Headings
  // ------------------------------------------------------------
  h1: 'text-2xl sm:text-3xl md:text-4xl  font-bold leading-tight',
  h2: 'text-xl sm:text-2xl md:text-3xl  font-semibold leading-snug',
  h3: 'text-lg sm:text-xl md:text-2xl  font-medium leading-snug',
  h4: 'text-base sm:text-lg md:text-xl font-medium leading-snug',
  h5: 'text-sm sm:text-base md:text-lg  font-medium leading-snug',
  h6: 'text-xs sm:text-sm md:text-base  font-medium leading-snug',

  // ------------------------------------------------------------
  // Text & inline
  // ------------------------------------------------------------
  p: 'text-base sm:text-lg leading-relaxed',

  // ------------------------------------------------------------
  // Media & form controls
  // ------------------------------------------------------------
  img: '',
};
