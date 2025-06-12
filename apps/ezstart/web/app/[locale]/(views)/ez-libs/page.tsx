'use client';
import { H1, H2, Main, Section } from '@ezstart/ui/components';
import { libMeta } from './[lib]/meta/lib-meta';
import { LibMeta } from './[lib]/types';

export default function EzLibs() {
  return (
    <Main withHeaderOffset>
      <Section>
        <H1>EzLibs</H1>
        <H2 size={'h3'}>
          Check out my libraries, play with them, then install them!
        </H2>
      </Section>
      {(Object.entries(libMeta) as [LibId, LibMeta][]).map(([libId]) => (
        <LibSection key={libId} libId={libId} />
      ))}
    </Main>
  );
}
