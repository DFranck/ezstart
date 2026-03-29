'use client'

import { ProjectCard } from '@/components/ProjectCard'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { ProjectItem } from '@/types/projects'
import { getTranslationArray } from '@ezstart/ui/lib'
import { H2, Section, UL } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { FC, HTMLAttributes } from 'react'

type Props = HTMLAttributes<HTMLElement>

const ProjectsSection: FC<Props> = ({ className, ...rest }) => {
  const { isMobile } = useDevice()
  const t = useSafeTranslations('projects')
  const projects = getTranslationArray<ProjectItem>(t, 'items')
  return (
    <Section className={className} {...rest} size={isMobile ? 'xs' : 'lg'}>
      <H2>{t('title')}</H2>
      <UL className="gap-4 md:gap-8" size={'xs'}>
        {projects.map(project => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </UL>
    </Section>
  )
}

export default ProjectsSection
