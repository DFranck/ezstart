'use client';
import {
  Li,
  Main,
  Section,
  tagVariantsKeys,
  tagVariantsMeta,
  Ul,
} from '@ezstart/ui/components';
import Link from 'next/link';
import { HeaderLib } from '../components/header-lib';
const mainMeta = tagVariantsMeta['main'];

const EzTagPage = () => {
  const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const shownTags = [
    ...tagVariantsKeys.filter((tag) => !headingTags.includes(tag)),
    'heading',
  ];
  return (
    <Main withHeaderOffset>
      <HeaderLib lib='eztag' />
      <Section>
        <Ul layout={'grid'} align='between' variant={'outline'}>
          {shownTags
            .filter(
              (tag) => tag !== 'main' && tag !== 'header' && tag !== 'footer'
            )
            .map((tag) => (
              <Li
                key={tag}
                intent='info'
                align='center'
                variant={'outline'}
                button
                asChild
              >
                <Link href={'/ez-libs/tag/' + tag}>
                  {tag.toUpperCase().slice(0, 1) + tag.slice(1)}
                </Link>
              </Li>
            ))}
        </Ul>
      </Section>
      {/* <Section>
        <H2>Main Tag</H2>
        <MainPlaygroundControls
          meta={mainMeta}
          selected={mainVariants}
          onChange={handleChange}
        />
      </Section>
      <Section>
        <H2>Heading Tags</H2>
        <HeadingPlayground />
      </Section>

     
      <Section>
        <H2>P Tag</H2>
        <PPlayground />
      </Section>
      <Section>
        <H2>Listing Tags</H2>
        <ListingPlayground />
      </Section> */}
    </Main>
  );
};

export default EzTagPage;
