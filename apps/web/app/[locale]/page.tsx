import { SectionContact } from '@/components/layout/Section/SectionContact';
import { SectionHero } from '@/components/layout/Section/SectionHero';
import { SectionTrust } from '@/components/layout/Section/SectionTrust';
import { SectionVision } from '@/components/layout/Section/SectionVision';

export default function Page() {
  return (
    <>
      <SectionHero />
      <SectionVision />
      <SectionTrust />
      <SectionContact />
    </>
  );
}
