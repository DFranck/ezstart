import { asideVariants, asideVariantsMeta } from '../tags/aside';
import { divVariants, divVariantsMeta } from '../tags/div';
import { footerVariants, footerVariantsMeta } from '../tags/footer';
import { headerVariants, headerVariantsMeta } from '../tags/header';
import { mainVariants, mainVariantsMeta } from '../tags/main';
import { navVariants, navVariantsMeta } from '../tags/nav';
import { sectionVariants, sectionVariantsMeta } from '../tags/section';

export const layoutVariants = {
  section: sectionVariants,
  main: mainVariants,
  header: headerVariants,
  footer: footerVariants,
  div: divVariants,
  aside: asideVariants,
  nav: navVariants,
};

export const layoutVariantsMeta = {
  main: mainVariantsMeta,
  section: sectionVariantsMeta,
  header: headerVariantsMeta,
  footer: footerVariantsMeta,
  div: divVariantsMeta,
  aside: asideVariantsMeta,
  nav: navVariantsMeta,
};
