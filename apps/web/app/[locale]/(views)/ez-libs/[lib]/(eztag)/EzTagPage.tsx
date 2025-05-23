'use client';
import { EzTag, H2, Main, Section } from '@ezstart/ez-tag';
import { getAllTagVariants } from './getAllTagVariants';
import { HeadingPlayground } from './HeadingPlayground';

const EzTagPage = () => {
  const variants = getAllTagVariants();
  return (
    <Main withHeader>
      <EzTag as='section'>
        <EzTag as='h1'>EzTag</EzTag>
        <EzTag as='h3'>
          Here you can find the documentation of EzTag wwith all the props and
          supported tag playground
        </EzTag>
      </EzTag>
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

export default EzTagPage;
