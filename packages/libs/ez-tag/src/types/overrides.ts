// src/types/overrides.ts

/**
 * For each tag listed here, these props become **required**,
 * on top of the intrinsic JSX props for that tag.
 */
export type EzTagOverrides = {
  img: {
    alt: string;
    src: string;
    width: number;
    height: number;
  };
  input: {
    type: string;
  };
  a: { href: string };
  // add more tags here if you need to force props
};
