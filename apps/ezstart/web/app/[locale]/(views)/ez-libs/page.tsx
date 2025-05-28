'use client';
import { H1, H2, Main, Section } from '@ezstart/ui/components';
import { LibSection } from './[lib]/components/section-lib';
import { libMeta } from './[lib]/meta/lib-meta';
import { LibId, LibMeta } from './[lib]/types';

export default function EzLibs() {
  return (
    <Main padding>
      <Section>
        <H1>EzLibs</H1>
        <H2>Check my libs, play with then install it!</H2>
      </Section>
      {(Object.entries(libMeta) as [LibId, LibMeta][]).map(([libId]) => (
        <LibSection key={libId} libId={libId} />
      ))}
    </Main>
  );
}
