'use client';
import { EzTag, H2, Main, Section } from '@ezstart/ez-tag';
import { getAllTagVariants } from './getAllTagVariants';
import { HeadingPlayground } from './HeadingPlayground';
const EzTagPage = () => {
  const variants = getAllTagVariants();
  return (
    <Main withHeader>
      <EzTag as='section' className=''>
        <EzTag as='h1'>EzTag</EzTag>
        <EzTag as='h3'>
          Here you can find the documentation of EzTag wwith all the props and
          supported tag playground
        </EzTag>
      </EzTag>
      <Section>
        <H2>Heading Tags</H2>
        <HeadingPlayground />
      </Section>
    </Main>
  );
};

export default EzTagPage;
