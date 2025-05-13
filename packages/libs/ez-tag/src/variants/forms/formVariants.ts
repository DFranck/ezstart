// packages/libs/ez-tag/src/variants/forms/formVariants.ts
import { buttonVariants } from './form-variants/buttonsVariants';

export const formVariants = {
  button: buttonVariants,
};

export type formTag = keyof typeof formVariants;
