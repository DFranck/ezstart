'use client';

import { LibraryType } from '@/types/libs';
import { Button, Div, H3, H4, Icon, P, Section } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
  lib: LibraryType;
  index?: number;
}

export const LibSection = ({ lib, index }: Props) => {
  const { isMobile } = useDevice();
  return (
    <Section
      id={lib.title.toLowerCase()}
      layout={'grid'}
      size={isMobile ? 'xs' : undefined}
    >
      <Div size={'full'} className='relative aspect-square lg:aspect-auto'>
        <Image
          fill
          src={lib.src}
          alt={lib.title}
          className='object-cover aspect-square rounded shadow'
        />
      </Div>
      <Div layout={'col'} className='gap-4'>
        <Div size={'xs'}>
          <H3 size='h2'>{lib.title}</H3>
          <H4 size={'h5'}>{lib.subtitle}</H4>
          <P variant={'description'}>{lib.description}</P>
        </Div>
        <Button asChild>
          <Link href={lib.links.local}>
            <Icon name='lucide:Book' />
            Voir {lib.title}
          </Link>
        </Button>
      </Div>
    </Section>
  );
};
