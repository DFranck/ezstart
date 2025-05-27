'use client';
import { SectionContact } from '@/components/layout/section/section-contact';
import { SectionHero } from '@/components/layout/section/section-hero';
import { SectionTrust } from '@/components/layout/section/section-trust';
import { SectionVision } from '@/components/layout/section/section-vision';
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
