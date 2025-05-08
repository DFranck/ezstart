import { SectionFeatures } from '@/components/layout/Section/SectionFeatures';
import { SectionHero } from '@/components/layout/Section/SectionHero';
import { SectionVision } from '@/components/layout/Section/SectionVision';

export default function Page() {
  return (
    <>
      <SectionHero />
      <SectionVision />
      <SectionFeatures />
    </>
  );
}
