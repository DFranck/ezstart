'use client';
import { H1, H2, Main, Section, Tag } from '@ezstart/ui/components';
import {
  libData,
  LibSection,
} from '../../../../components/layout/Section/section-lib';

export default function EzLibs() {
  return (
    <Main withFixedHeader>
      <Section>
        <H1>EzLibs</H1>
        <Tag as='h1'>ezstart</Tag>
        <H2>Check my libs, play with then install it!</H2>
      </Section>
      {Object.values(libData).map((lib) => (
        <LibSection key={lib.name} {...lib} />
      ))}
    </Main>
  );
}
