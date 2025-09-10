import TechList from '@/components/TechList'
import { LibraryItem } from '@/types/library'
import { getTranslationArray } from '@/utils/get-translation-array'
import { Button, Div, H3, H4, Icon, P, Section } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import Image from 'next/image'
import Link from 'next/link'

export const HeaderLib = ({ libTitle }: { libTitle: string }) => {
  const { isMobile } = useDevice()
  const t = useSafeTranslations('libraries')
  const libraries = getTranslationArray<LibraryItem>(t, 'items')
  const lib = libraries.find(lib => lib.title.toLowerCase() === libTitle.toLowerCase())
  if (!lib) {
    return <p>Librairie introuvable</p>
  }

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
        <TechList tech={lib.tech} />
        <Div size={'default'} layout={'center'} className="flex-row">
          {lib.links.github && (
            <Button asChild>
              <Link href={lib.links.github || ''}>
                <Icon name="fa:FaGithub" />
                GitHub
              </Link>
            </Button>
          )}
          {lib.links.npm && (
            <Button asChild>
              <Link href={lib.links.npm || ''}>
                <Icon name="fa:FaNpm" />
                NPM
              </Link>
            </Button>
          )}
        </Div>
      </Div>
    </Section>
  )
}
