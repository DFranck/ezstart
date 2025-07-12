'use client';

import { mapProjectTechToSkills } from '@/utils/map-project-tech-to-skills';
import {
  Div,
  H3,
  Icon,
  isValidIconName,
  LI,
  P,
  UL,
} from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import Image from 'next/image';
import Link from 'next/link';
import skillsJson from '../app/[locale]/(views)/(statics)/about/skills.json';
import { ReadMoreText } from './ReadMoreText';

type ProjectCardProps = {
  title: string;
  subtitle?: string;
  roles?: string[];
  description: string;
  link?: string | null;
  src?: string;
  tech?: string[];
  private?: boolean;
};

export function ProjectCard({
  title,
  subtitle,
  roles,
  description,
  link,
  src,
  tech,
  private: isPrivate,
}: ProjectCardProps) {
  const { isMobile } = useDevice();
  const techList = tech ? mapProjectTechToSkills(tech, skillsJson.skills) : [];
  return (
    <LI variant={'outline'} layout={'col'} className='p-2'>
      <Div layout={'row'} size={'xs'}>
        <Div size={'default'} layout={'default'}>
          <H3 size={'h5'}>{title}</H3>
          {subtitle && (
            <P variant={'description'} size={'xs'} className='text-left'>
              {subtitle}
            </P>
          )}
        </Div>
        <Div size={'default'} layout={'default'}>
          {roles?.map((role) => (
            <H3 size={'h5'} key={role}>
              {role}
            </H3>
          ))}
        </Div>
      </Div>

      {src && (
        <div className='max-h-56 md:max-h-96 overflow-y-auto rounded'>
          <Image
            src={src}
            alt={title}
            width={500}
            height={300}
            className='w-full h-auto object-contain'
          />
        </div>
      )}

      <Div size={'xs'}>
        <ReadMoreText
          text={description}
          className='text-justify text-xs text-muted-foreground '
        />

        {techList.length > 0 && (
          <UL className='text-xs' layout={'row'} size={'default'}>
            {techList.map((tech) => (
              <LI
                key={tech.name}
                variant={isMobile ? 'default' : 'card'}
                size={'default'}
                className='py-1 px-2 whitespace-nowrap flex items-center gap-2'
              >
                {isValidIconName(tech.icon) ? (
                  <Icon name={tech.icon} size={20} />
                ) : (
                  <Icon name='lucide:HelpCircle' size={20} />
                )}
                {!isMobile && tech.name}
              </LI>
            ))}
          </UL>
        )}
      </Div>

      <Div size={'xs'}>
        {link ? (
          <Link
            href={link}
            target='_blank'
            rel='noopener noreferrer'
            className='text-cyan-600 text-sm hover:underline'
          >
            Voir le projet →
          </Link>
        ) : isPrivate ? (
          <P variant={'description'}>Projet privé</P>
        ) : null}
      </Div>
    </LI>
  );
}
