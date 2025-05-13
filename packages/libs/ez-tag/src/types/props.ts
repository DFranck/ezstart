import { VariantKey } from '../styles';
import { IntrinsicProps, LayoutTag, TagWithChildren } from './supported-tags';

export type EzTagProps<T extends LayoutTag = 'div'> = {
  /** override the tag (defaults to 'div' in your component) */
  as?: T;
  /** pick one of your Tailwind variant keys for this tag */
  variant?: VariantKey<T>;
} /** all the native HTML props for that tag… */ & Omit<
  IntrinsicProps<T>,
  'as' | 'children'
> &
  /** …plus children only on tags that accept them */
  (T extends TagWithChildren
    ? { children?: React.ReactNode }
    : { children?: never });
