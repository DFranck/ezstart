'use client';
import { Button, Div, H2, H4, Icon, Section } from '@ezstart/ui';
import Link from 'next/link';
import { LibMeta } from '../libData';

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
