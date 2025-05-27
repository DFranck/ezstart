'use client';
import { Button, Div, H2, H4, Icon, Section } from '@ezstart/ui/components';
import Link from 'next/link';

export type LibId = keyof typeof libData;
export type LibMeta = (typeof libData)[LibId];

export const libData = {
  'ez-tag': {
    name: 'Tag',
    description:
      "Tag is a React component library that provides a set of reusable components for building user interfaces. It's using TailwindCSS.",
    href: '/ez-libs/ez-tag',
    github:
      'https://github.com/DFranck/ezstart/tree/master/packages/libs/ez-tag',
    npm: 'https://www.npmjs.com/package/@ezstart/ui',
  },
  icon: {
    name: 'Icon',
    description:
      'Icon is a React icon library that provides a customizable set of icons from lucide.dev and other sources.',
    href: '/ez-libs/ez-icon',
    github:
      'https://github.com/DFranck/ezstart/tree/master/packages/libs/ez-icon',
    npm: '',
  },
} as const;

export const LibSection = ({
  name,
  description,
  href,
  github,
  npm,
}: LibMeta) => {
  return (
    <Section>
      <H2>{name}</H2>
      <H4>{description}</H4>
      <Div className='flex gap-2'>
        <Button asChild>
          <Link href={href}>
            <Icon name='lucide:Book' />
            {name} documentation
          </Link>
        </Button>
        <Button asChild variant='outline' disabled={!github}>
          <Link href={github || ''} target='_blank'>
            <Icon name='lucide:Github' />
            {name} code
          </Link>
        </Button>
        <Button asChild variant='outline' disabled={!npm}>
          <Link href={npm || ''} target='_blank'>
            <Icon name='fa:FaNpm' />
            {name} lib
          </Link>
        </Button>
      </Div>
    </Section>
  );
};
