'use client';
import { Button, Div, H2, H4, Icon, Section } from '@ezstart/ui/components';
import Link from 'next/link';
import { LibMeta } from '../types';

export const LibSection = ({ name, description, github }: LibMeta) => {
  return (
    <Section variant={'card'}>
      <H2>{name}</H2>
      <H4>{description}</H4>
      <Div className='flex gap-2'>
        <Button asChild>
          <Link href={'/ez-libs/' + name.toLowerCase()}>
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
      </Div>
    </Section>
  );
};
