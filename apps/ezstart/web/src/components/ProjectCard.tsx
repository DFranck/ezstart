'use client'

import { ProjectItem } from '@/types/projects'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { Badge, Button, Div, H3, LI, P } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import Image from 'next/image'
import Link from 'next/link'
import { ReadMoreText } from '@ezstart/ui/components'
import TechList from './TechList'

type Props = {
  project: ProjectItem
}

export function ProjectCard({ project }: Props) {
  const { isMobile } = useDevice()
  const t = useSafeTranslations('common')

  return (
    <LI variant="outline" layout="col" className="p-2">
      <Div layout="grid" size="xs">
        <Div size="default" layout="default">
          <H3 size="h5">{project.title}</H3>
          {project.subtitle && (
            <P variant="description" size="xs" className="text-left">
              {project.subtitle}
            </P>
          )}
        </Div>

        <Div size="default" layout="row" className="justify-center md:justify-end gap-2 flex-wrap">
          {project.roles?.map(role => (
            <Badge key={role} size={'lg'} variant="default" className="bg-brand text-white">
              {role}
            </Badge>
          ))}
        </Div>
      </Div>

      {project.src && (
        <Div className="max-h-56 md:max-h-96 overflow-y-auto rounded">
          <Image
            src={isMobile && project.src.mobile ? project.src.mobile : project.src.desktop}
            alt={project.title}
            width={500}
            height={300}
            className="w-full h-auto object-contain"
          />
        </Div>
      )}

      <Div size="xs">
        <ReadMoreText
          text={project.description}
          className="text-justify text-xs text-muted-foreground"
        />
        <TechList tech={project.tech ?? []} />
      </Div>

      <Div size="xs" layout="row" className="gap-2 flex-wrap">
        {project.link ? (
          <Link href={project.link} target="_blank" rel="noopener noreferrer">
            <Button variant="default" size="sm">
              {t('viewProject')}
            </Button>
          </Link>
        ) : project.private ? (
          <P variant="description">{t('privateProject')}</P>
        ) : null}
      </Div>
    </LI>
  )
}
