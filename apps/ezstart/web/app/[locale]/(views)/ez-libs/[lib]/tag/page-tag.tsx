'use client';
import { H2, Main, Section, Tag } from '@ezstart/ui/components';
import { HeadingPlayground } from './heading-playground';

const TagPage = () => {
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
