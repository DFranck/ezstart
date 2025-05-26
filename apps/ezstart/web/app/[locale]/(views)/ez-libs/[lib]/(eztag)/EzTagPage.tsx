'use client';
import { Tag, H2, Main, Section } from '@ezstart/ui';
import { getAllTagVariants } from './getAllTagVariants';
import { HeadingPlayground } from './HeadingPlayground';

const TagPage = () => {
  const variants = getAllTagVariants();
  return (
    <Main withHeader>
      <Tag as='section'>
        <Tag as='h1'>Tag</Tag>
        <Tag as='h3'>
          Here you can find the documentation of Tag wwith all the props and
          supported tag playground
        </Tag>
      </Tag>
      <Section size={'xl'}>
        <H2>Heading Tags</H2>
        <HeadingPlayground />
      </Section>
      <Section size={'xl'}>
        <H2>Waiting more Tags...</H2>
      </Section>
    </Main>
  );
};

export default TagPage;
