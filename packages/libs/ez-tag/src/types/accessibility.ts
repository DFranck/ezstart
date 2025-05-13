import { LayoutTag } from './supported-tags';

/**
 * This mapping **must** cover every tag in `LayoutTag`.
 * TS will error if any tag is missing.
 */
type A11yProps = Record<string, string>;

export const EzTagA11y: { [T in LayoutTag]: A11yProps } = {
  nav: { role: 'navigation', 'aria-label': 'main navigation' },
  aside: { role: 'complementary' },
  main: { role: 'main' },
  header: { role: 'banner' },
  footer: { role: 'contentinfo' },
  article: { role: 'article' },
  section: { role: 'region' },
  img: { role: 'img' },
  h1: { role: 'heading', 'aria-level': '1' },
  h2: { role: 'heading', 'aria-level': '2' },
  h3: { role: 'heading', 'aria-level': '3' },
  h4: { role: 'heading', 'aria-level': '4' },
  h5: { role: 'heading', 'aria-level': '5' },
  h6: { role: 'heading', 'aria-level': '6' },
  // ❗ May need to be updated:
  div: {},
  span: {},
  p: {},
};
