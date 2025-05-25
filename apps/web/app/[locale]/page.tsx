import { SectionContact } from '@/components/layout/Section/SectionContact';
import { SectionHero } from '@/components/layout/Section/SectionHero';
import { SectionTrust } from '@/components/layout/Section/SectionTrust';
import { SectionVision } from '@/components/layout/Section/SectionVision';
import { Main } from '@ezstart/ui';
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
