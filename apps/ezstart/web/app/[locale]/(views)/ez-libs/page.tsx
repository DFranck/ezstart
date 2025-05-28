'use client';
import { H1, H2, Main, Section } from '@ezstart/ui/components';
import { LibSection } from './[lib]/components/section-lib';
import { libMeta } from './[lib]/meta/lib-meta';

export default function EzLibs() {
  return (
    <Main padding>
      <Section>
        <H1>EzLibs</H1>
        <H2>Check my libs, play with then install it!</H2>
      </Section>
      {Object.values(libMeta).map((lib) => (
        <LibSection key={lib.name} {...lib} />
      ))}
    </Main>
  );
}
