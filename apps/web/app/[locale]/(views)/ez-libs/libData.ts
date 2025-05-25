// packages/web/lib/data/libData.ts

export const libData = {
  'ez-tag': {
    name: 'EzTag',
    description:
      "EzTag is a React component library that provides a set of reusable components for building user interfaces. It's using TailwindCSS.",
    href: '/ez-libs/ez-tag',
    github:
      'https://github.com/DFranck/ezstart/tree/master/packages/libs/ez-tag',
    npm: 'https://www.npmjs.com/package/@ezstart/ui',
  },
  'ez-icon': {
    name: 'Icon',
    description:
      'Icon is a React icon library that provides a customizable set of icons from lucide.dev and other sources.',
    href: '/ez-libs/ez-icon',
    github:
      'https://github.com/DFranck/ezstart/tree/master/packages/libs/ez-icon',
    npm: '',
  },
  'ez-billing': {
    name: 'EzBilling',
    description:
      'EzBilling is a destined to become a Saas or other monayable product where you can manage your subscriptions and payments.',
    href: '/ez-libs/ez-billing',
    github:
      'https://github.com/DFranck/ezstart/tree/master/packages/libs/ez-billing',
    npm: '',
  },
} as const;

export type LibId = keyof typeof libData;
export type LibMeta = (typeof libData)[LibId];
