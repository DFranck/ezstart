'use client';
import { SectionContact } from '@/components/layout/Section/section-contact';
import { SectionHero } from '@/components/layout/Section/section-hero';
import { SectionTrust } from '@/components/layout/Section/section-trust';
import { SectionVision } from '@/components/layout/Section/section-vision';
import { Main } from '@ezstart/ui/components';
export default function Page() {
  return (
    <Main>
      <SectionHero />
      <SectionVision />
      <SectionTrust />
      <SectionContact />
    </Main>
  );
}
