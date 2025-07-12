'use client';

import ProjectsSection from '@/app/[locale]/(home)/ProjectsSection';
import { FlippingGallery } from '@/components/ui/flipping-gallery';
import { Main } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import HeroSection from './HeroSection';
import { SkillsSection } from './SkillsSection';

export default function AboutPage() {
  const t = useTranslations('about');
  const p = useTranslations('ProjectsSection');
  const projects = p.raw('projects') as {
    title: string;
    subtitle?: string;
    description: string;
    link: string | null;
    src: string;
    tech?: string[];
    private?: boolean;
  }[];

  return (
    <Main>
      <HeroSection />
      <SkillsSection />
      <ProjectsSection />
      <FlippingGallery items={projects} />
    </Main>
  );
}
