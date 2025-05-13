import { SectionContact } from '@/components/layout/Section/SectionContact';
import { SectionHero } from '@/components/layout/Section/SectionHero';
import { SectionTrust } from '@/components/layout/Section/SectionTrust';
import { SectionVision } from '@/components/layout/Section/SectionVision';
import { EzTag } from '@ezstart/ez-tag';

export default function Page() {
  return (
    <EzTag as='main'>
      <SectionHero />
      <SectionVision />
      <SectionTrust />
      <SectionContact />
    </EzTag>
  );
}
