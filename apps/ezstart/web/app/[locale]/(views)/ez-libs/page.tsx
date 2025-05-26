'use client';
import { H1, H2, Main, Section } from '@ezstart/ui';
import { LibSection } from './components/LibSection';
import { libData } from './libData';

export default function EzLibs() {
  return (
    <Main withHeader>
      <Section>
        <H1>EzLibs</H1>

        <H2>Check my libs, play with them and install them!</H2>
      </Section>

      {Object.values(libData).map((lib) => (
        <LibSection key={lib.name} {...lib} />
      ))}
    </Main>
  );
}
