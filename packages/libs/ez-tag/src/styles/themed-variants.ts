import { LayoutTag } from '../types/supported-tags';

export const EzTagThemedVariants: Partial<
  Record<LayoutTag, Record<string, string>>
> = {
  header: {
    sticky: 'sticky top-0 z-50 bg-background/80 backdrop-blur',
  },
  footer: {
    dark: 'bg-foreground text-background',
  },
  span: {
    highlight: 'text-primary',
    warning: 'text-warning',
  },
  nav: {
    stickyBottom: 'fixed bottom-0 w-full z-50',
  },
};
