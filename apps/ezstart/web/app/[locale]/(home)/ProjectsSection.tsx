'use client';

import { ProjectCard } from '@/components/ProjectCard';
import { H2, Section, UL } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { useTranslations } from 'next-intl';
import { FC, HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement>;

const ProjectsSection: FC<Props> = ({ className, ...rest }) => {
  const t = useTranslations('ProjectsSection');
  const { isMobile } = useDevice();
  const projects = t.raw('projects') as {
    title: string;
    subtitle?: string;
    roles?: string[];
    description: string;
    link: string | null;
    src?: string;
    tech?: string[];
    private?: boolean;
  }[];

  return (
    <Section className={className} {...rest} size={isMobile ? 'xs' : 'lg'}>
      <H2>{t('title')}</H2>
      <UL className='md:gap-6' size={'xs'}>
        {projects.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
      </UL>
    </Section>
  );
};

export default ProjectsSection;
