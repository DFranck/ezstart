'use client';
import { getMeta } from '@/utils/get-meta';
import {
  Button,
  Div,
  H3,
  H4,
  Icon,
  Section,
  SectionVariant,
} from '@ezstart/ui/components';
import Link from 'next/link';
import { LibId } from '../types';
interface LibSectionProps {
  libId: LibId;
  variant?: SectionVariant;
}
export const LibSection = ({ libId, variant }: LibSectionProps) => {
  const { name, description, github, status } = getMeta('lib', libId);

  return (
    <Section variant={variant}>
      <H3 size='h2'>{name}</H3>
      <H4 size={'h5'}>{description}</H4>
      <Div layout={'grid'}>
        <Button asChild variant={variant ? 'secondary' : 'default'}>
          <Link href={'/ez-libs/' + name.toLowerCase()}>
            <Icon name='lucide:Book' />
            {name} documentation
          </Link>
        </Button>
        {github && (
          <Button
            asChild
            variant={'outline'}
            className={
              variant &&
              'bg-primary text-primary-foreground hover:bg-secondary/10 hover:text-primary-foreground'
            }
          >
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
