'use client';
import { getMeta } from '@/utils/get-meta';
import {
  Button,
  Div,
  H3,
  H4,
  H6,
  Icon,
  Section,
  Span,
} from '@ezstart/ui/components';
import Link from 'next/link';
import { LibId } from '../types';
interface LibSectionProps {
  libId: LibId;
}
export const LibSection = ({ libId }: LibSectionProps) => {
  const { name, description, github, status } = getMeta('lib', libId);

  return (
    <Section variant={'card'}>
      <Span>
        <H3 size='h2'>{name}</H3>
        {status === 'in progress' && (
          <Span intent={'warning'}>
            <H6>{status}</H6>
            <Icon name='lucide:LucideLoaderCircle' spin />
          </Span>
        )}
      </Span>
      <H4 size={'h5'}>{description}</H4>
      <Div layout={'grid'}>
        <Button asChild>
          <Link href={'/ez-libs/' + name.toLowerCase()}>
            <Icon name='lucide:Book' />
            {name} documentation
          </Link>
        </Button>
        {github && (
          <Button asChild variant='outline'>
            <Link href={github} target='_blank'>
              <Icon name='lucide:Github' />
              {name} code
            </Link>
          </Button>
        )}
      </Div>
    </Section>
  );
};
