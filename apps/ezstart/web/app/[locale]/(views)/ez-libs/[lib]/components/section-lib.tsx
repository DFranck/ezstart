'use client'

import { LibraryItem } from '@/types/library'
import { Button, Div, H3, H4, Icon, P, Section } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  lib: LibraryItem
  index?: number
}

export const LibSection = ({ lib, index }: Props) => {
  const { isMobile } = useDevice()
  return (
    <Section id={lib.title.toLowerCase()} layout={'grid'} size={isMobile ? 'xs' : 'xl'}>
      <Div size={'full'} className="relative aspect-square lg:aspect-auto">
        <Image
          fill
          src={lib.src}
          alt={lib.title}
          className="object-cover aspect-square rounded shadow"
        />
      </Div>
      <Div layout={'col'} className="gap-4">
        <Div size={'xs'}>
          <H3 size="h2">{lib.title}</H3>
          <H4 size={'h5'}>{lib.subtitle}</H4>
          <P variant={'description'}>{lib.description}</P>
        </Div>
        {lib.links.github && (
          <Button asChild>
            <Link href={lib.links.github} target="_blank" rel="noopener noreferrer">
              <Icon name="fa:FaGithub" />
              Readme
            </Link>
          </Button>
        )}
        <Button asChild variant={'outline'}>
          <Link href={lib.links.local}>
            <Icon name="fa:FaPlay" />
            {lib.title}
          </Link>
        </Button>
      </Div>
    </Section>
  )
}
