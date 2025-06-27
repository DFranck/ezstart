'use client';

import { ProjectCard } from '@/components/ProjectCard';
import { H2, Section, UL } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import { FC, HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement>;

const ProjectsSection: FC<Props> = ({ className, ...rest }) => {
  const t = useTranslations('ProjectsSection');

  const projects = t.raw('projects') as {
    title: string;
    subtitle?: string;
    description: string;
    link: string | null;
    image?: string;
    tech?: string[];
    private?: boolean;
  }[];

  return (
    <Section className={className} {...rest}>
      <H2>{t('title')}</H2>
      <UL layout='grid' size={'xs'}>
        {projects.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
      </UL>
    </Section>
  );
};

export default ProjectsSection;
