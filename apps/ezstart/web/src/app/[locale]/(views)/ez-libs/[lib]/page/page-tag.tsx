'use client'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { LibraryItem } from '@/types/library'
import { getTranslationArray } from '@/utils/get-translation-array'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  H3,
  HEADING_TAGS,
  Icon,
  LISTING_TAGS,
  Main,
  P,
  Section,
  tagVariantsKeys,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { HeaderLib } from '../components/header-lib'

const EzTagPage = (): any => {
  const t = useSafeTranslations('libraries')
  const commonT = useSafeTranslations('common')
  const libraries = getTranslationArray<LibraryItem>(t, 'items')
  const lib = libraries.find(lib => lib.title.toLowerCase() === 'tag')

  const headingTagSet = new Set(HEADING_TAGS)
  const listingTagSet = new Set(LISTING_TAGS)
  const shownTags = [
    ...tagVariantsKeys.filter(
      tag => !headingTagSet.has(tag as any) && !listingTagSet.has(tag as any)
    ),
    `heading`,
    `listing`,
  ]

  if (!lib) {
    return (
      <Main withHeaderOffset>
        <p>{t('notFound')}</p>
      </Main>
    )
  }

  return (
    <Main withHeaderOffset>
      <HeaderLib libTitle="tag" />
      <Section layout="col" size="xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4 text-center">
            <H3>{lib.content?.title}</H3>
            <P className="text-muted-foreground max-w-2xl mx-auto">{lib.content?.subtitle}</P>
            <Badge variant="warning" dot pulse size="lg">
              {commonT('inProgress')}
            </Badge>
          </div>

          {/* Tags Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {shownTags
              .filter(tag => tag !== 'main' && tag !== 'header' && tag !== 'footer')
              .map(tag => (
                <Link key={tag} href={'/ez-libs/tag/' + tag}>
                  <Card interactive hover="lift" variant="outline" size="sm" className="h-full">
                    <CardContent className="flex items-center justify-center py-6">
                      <P className="font-mono font-medium text-sm">&lt;{tag}&gt;</P>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>

          {/* Info Card */}
          <Card variant="floating" className="mt-8">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="lucide:Info" className="text-primary" size={20} />
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="text-base">How to use</CardTitle>
                  <CardDescription>
                    Click on any tag to see its available variants, props, and usage examples. Each
                    tag is a semantic HTML element with custom styling options.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </Section>
    </Main>
  )
}

export default EzTagPage
