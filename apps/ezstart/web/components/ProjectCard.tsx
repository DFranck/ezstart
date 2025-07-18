'use client';

import { ProjectItem } from '@/types/projects';
import { Button, Div, H3, LI, P } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import Image from 'next/image';
import Link from 'next/link';
import { ReadMoreText } from './ReadMoreText';
import TechList from './TechList';

type Props = {
  project: ProjectItem;
};

export function ProjectCard({ project }: Props) {
  const { isMobile } = useDevice();

  return (
    <LI variant='outline' layout='col' className='p-2'>
      <Div layout='grid' size='xs'>
        <Div size='default' layout='default'>
          <H3 size='h5'>{project.title}</H3>
          {project.subtitle && (
            <P variant='description' size='xs' className='text-left'>
              {project.subtitle}
            </P>
          )}
        </Div>

        <Div
          size='default'
          layout='row'
          className='justify-center md:justify-end'
        >
          {project.roles?.map((role) => (
            <Button size='sm' key={role} className='cursor-default'>
              {role}
            </Button>
          ))}
        </Div>
      </Div>

      {project.src && (
        <div className='max-h-56 md:max-h-96 overflow-y-auto rounded'>
          <Image
            src={isMobile ? project.src.mobile : project.src.desktop}
            alt={project.title}
            width={500}
            height={300}
            className='w-full h-auto object-contain'
          />
        </div>
      )}

      <Div size='xs'>
        <ReadMoreText
          text={project.description}
          className='text-justify text-xs text-muted-foreground'
        />
        <TechList tech={project.tech ?? []} />
      </Div>

      <Div size='xs'>
        {project.link ? (
          <Link
            href={project.link}
            target='_blank'
            rel='noopener noreferrer'
            className='text-cyan-600 text-sm hover:underline'
          >
            Voir le projet →
          </Link>
        ) : project.private ? (
          <P variant='description'>Projet privé</P>
        ) : null}
      </Div>
    </LI>
  );
}
