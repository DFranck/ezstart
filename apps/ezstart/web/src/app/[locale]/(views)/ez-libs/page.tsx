import { LibraryItem } from '@/types/library'
import { getTranslationArray } from '@/utils/get-translation-array'
import { H1, H2, Main, P, Section } from '@ezstart/ui/components'
import { getTranslations } from 'next-intl/server'
import { LibSection } from './[lib]/components/section-lib'

export default async function EzLibs() {
  const t = await getTranslations('libraries')
  const libraries = getTranslationArray<LibraryItem>(t, 'items')
  return (
    <Main withHeaderOffset>
      <Section size={'xl'}>
        <H1>{t('title')}</H1>
        <H2 size={'h3'}>{t('subtitle')}</H2>
        <P variant={'description'}>{t('description')}</P>
      </Section>
      {libraries.map((lib, index) => (
        <LibSection key={lib.title} lib={lib} index={index} />
      ))}
    </Main>
  )
}
