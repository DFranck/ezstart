'use client';
import {
  HEADING_TAGS,
  LI,
  LISTING_TAGS,
  Main,
  Section,
  tagVariantsKeys,
  UL,
} from '@ezstart/ui/components';
import Link from 'next/link';
import { HeaderLib } from '../components/header-lib';

const EzTagPage = () => {
  const headingTagSet = new Set(HEADING_TAGS);
  const listingTagSet = new Set(LISTING_TAGS);
  const shownTags = [
    ...tagVariantsKeys.filter(
      (tag) => !headingTagSet.has(tag as any) && !listingTagSet.has(tag as any)
    ),
    `heading`,
    `listing`,
  ];

  return (
    <Main withHeaderOffset>
      <HeaderLib lib='eztag' />
      <Section variant={'primary'}>
        <UL layout={'grid'} className='xl:grid-cols-3'>
          {shownTags
            .filter(
              (tag) => tag !== 'main' && tag !== 'header' && tag !== 'footer'
            )
            .map((tag) => (
              <LI key={tag} variant={'card'} button asChild layout={'center'}>
                <Link href={'/ez-libs/tag/' + tag}>
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
