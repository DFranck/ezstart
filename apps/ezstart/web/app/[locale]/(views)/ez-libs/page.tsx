'use client';
import { libData, LibSection } from '@/components/layout/section/section-lib';
import { H1, H2, Main, Section } from '@ezstart/ui/components';

export default function EzLibs() {
  return (
    <Main padding>
      <Section>
        <H1>EzLibs</H1>
        <H2>Check my libs, play with then install it!</H2>
      </Section>
      {Object.values(libData).map((lib) => (
        <LibSection key={lib.name} {...lib} />
      ))}
    </Main>
  );
}
