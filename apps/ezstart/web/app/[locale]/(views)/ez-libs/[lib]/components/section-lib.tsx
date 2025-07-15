'use client';

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

interface LibSectionProps {
  lib: {
    title: string;
    subtitle: string;
    description: string;
    link: string;
    src: string;
    tech: string[];
  };
  index?: number;
  variant?: SectionVariant;
}

export const LibSection = ({ lib, variant }: LibSectionProps) => {
  return (
    <Section variant={variant} id={lib.title.toLowerCase()}>
      <H3 size='h2'>{lib.title}</H3>
      <H4 size={'h5'}>{lib.subtitle}</H4>
      <p className='text-muted-foreground'>{lib.description}</p>

      <Div layout={'grid'} className='gap-4 mt-4'>
        <Button asChild>
          <Link href={lib.link}>
            <Icon name='lucide:Book' />
            Voir {lib.title}
          </Link>
        </Button>
      </Div>
    </Section>
  );
};
