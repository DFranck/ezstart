// packages/libs/ez-tag/src/variants/forms/formVariants.ts
import { buttonVariant } from './form-variants/buttonsVariants';

export const formVariants = {
  button: buttonVariant,
};

export type formTag = keyof typeof formVariants;
