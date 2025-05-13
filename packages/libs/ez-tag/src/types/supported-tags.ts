// src/types/supported-tags.ts
import { ComponentProps } from 'react';

/**
 * ① Tags that accept children in their JSX syntax
 * (e.g. <div>…</div>, <section>…</section>)
 */
export const TAGS_WITH_CHILDREN = [
  'div',
  'span',
  'section',
  'main',
  'header',
  'footer',
  'aside',
  'nav',
  'article',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
] as const;

/**
 * ② Void tags—no children allowed
 * (e.g. <img />, <br />, <meta />, etc.)
 */
export const TAGS_WITHOUT_CHILDREN = ['img'] as const;

/**
 * ③ Automatically generated union types
 * based on the arrays above
 */
export type TagWithChildren = (typeof TAGS_WITH_CHILDREN)[number];
export type TagWithoutChildren = (typeof TAGS_WITHOUT_CHILDREN)[number];

/**
 * ④ All supported tags, combined
 * Used for iteration or exhaustive checks
 */
export const ALL_LAYOUT_TAGS = [
  ...TAGS_WITH_CHILDREN,
  ...TAGS_WITHOUT_CHILDREN,
] as const;

export type LayoutTag = (typeof ALL_LAYOUT_TAGS)[number];

/**
 * ⑤ Intrinsic JSX props for each tag
 * Maps LayoutTag → the built-in JSX element props
 */
export type IntrinsicProps<T extends LayoutTag> = ComponentProps<T>;
