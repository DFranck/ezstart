'use client';
import { LibraryType } from '@/types/libs';
import { getTranslationArray } from '@/utils/get-translation-array';
import {
  H3,
  HEADING_TAGS,
  LI,
  LISTING_TAGS,
  Main,
  P,
  Section,
  tagVariantsKeys,
  UL,
} from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { HeaderLib } from '../components/header-lib';

const EzTagPage = () => {
  const t = useTranslations('libraries');
  const libraries = getTranslationArray<LibraryType>(t, 'items');
  const lib = libraries.find((lib) => lib.title.toLowerCase() === 'tag');

  const headingTagSet = new Set(HEADING_TAGS);
  const listingTagSet = new Set(LISTING_TAGS);
  const shownTags = [
    ...tagVariantsKeys.filter(
      (tag) => !headingTagSet.has(tag as any) && !listingTagSet.has(tag as any)
    ),
    `heading`,
    `listing`,
  ];

  if (!lib) {
    return (
      <Main withHeaderOffset>
        <p>{t('notFound')}</p>
      </Main>
    );
  }

  return (
    <Main withHeaderOffset>
      <HeaderLib libTitle='tag' />
      <Section layout='col'>
        <H3>{lib.content?.title}</H3>
        <P className='w-full'>{lib.content?.subtitle}</P>
        <UL size={'default'} layout='row' className='justify-center'>
          {shownTags
            .filter(
              (tag) => tag !== 'main' && tag !== 'header' && tag !== 'footer'
            )
            .map((tag) => (
              <LI
                key={tag}
                layout={'center'}
                size={'default'}
                variant={'outline'}
              >
                <Link href={'/ez-libs/tag/' + tag} className='px-3 py-2'>
                  {tag.toUpperCase().slice(0, 1) + tag.slice(1)}
                </Link>
              </LI>
            ))}
        </UL>
      </Section>
    </Main>
  );
};

export default EzTagPage;
