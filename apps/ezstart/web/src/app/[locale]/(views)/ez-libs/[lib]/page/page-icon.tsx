'use client'

import { LibraryContentLink, LibraryItem } from '@/types/library'
import { getTranslationArray } from '@ezstart/ui/lib'
import { customIconMap, H3, Icon, LI, Main, P, Section, UL } from '@ezstart/ui/components'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import Link from 'next/link'
import { useMemo } from 'react'
import IconPlayground from '../(Icon)/IconPlayground'
import { HeaderLib } from '../components/header-lib'

const EzIconPage = (): any => {
  const t = useSafeTranslations('libraries')
  const libraries = getTranslationArray<LibraryItem>(t, 'items')
  const lib = libraries.find(lib => lib.title.toLowerCase() === 'icon')
  const contentItems = getTranslationArray<LibraryContentLink>(lib?.content, 'items')
  const customIcons = useMemo(() => Object.keys(customIconMap), [])

  if (!lib) {
    return (
      <Main withHeaderOffset>
        <P>{t('notFound')}</P>
      </Main>
    )
  }

  return (
    <Main withHeaderOffset>
      <HeaderLib libTitle="icon" />
      <Section layout="col" size={'xl'}>
        <P>{lib.content?.description}</P>
        <UL size={'default'} className="w-full">
          {contentItems.map(item => (
            <LI key={item.title}>
              {item.title}:{' '}
              <P asChild variant={'link'}>
                <Link href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.url}
                </Link>
              </P>
            </LI>
          ))}
        </UL>
        <H3>{lib.content?.title}</H3>
        {customIcons.length > 0 && (
          <UL size={'default'} layout="row" className="justify-center">
            {customIcons.map(name => (
              <LI key={name} layout={'center'} size={'sm'} className="md:w-28 aspect-square">
                <Icon name={`custom:${name}` as any} size={32} />
                <P className="text-xs text-center">{name}</P>
              </LI>
            ))}
          </UL>
        )}
        <IconPlayground title={lib.content?.subtitle as string} />
      </Section>
    </Main>
  )
}

export default EzIconPage
