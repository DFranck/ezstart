// packages/libs/ez-tag/src/classNames/inputs.ts
import { twJoin } from 'tailwind-merge';

const inputStyles = {
  text: twJoin(
    'rounded border-2 bg-white/20 p-2 outline-none',
    'invalid:!border-palette-red',
    'focus:border-palette-green'
  ),
  checkbox: twJoin(
    'w-5 h-5 appearance-none rounded border-2 outline-none',
    'checked:border-transparent checked:bg-palette-green',
    `checked:shadow-[0_0_0_2px_theme('colors.palette.text')_inset]`
  ),
  radio: twJoin(
    'w-5 h-5 appearance-none rounded-full border-2 outline-none',
    'checked:border-transparent checked:bg-palette-green',
    `checked:shadow-[0_0_0_3px_theme('colors.palette.text')_inset]`
  ),
} as const;

type InputVariant = keyof typeof inputStyles;
type InputKey = `input.${InputVariant}`;

export const inputVariants = ((): Record<InputKey, string> => {
  const out = {} as Record<InputKey, string>;
  (Object.keys(inputStyles) as Array<InputVariant>).forEach((v) => {
    out[`input.${v}`] = inputStyles[v];
  });
  return out;
})() satisfies Record<InputKey, string>;
