'use client';
import { Main } from '@ezstart/ui/components';
import ContactSection from './(home)/ContactSection';
import HeroSection from './(home)/HeroSection';
import ProjectsSection from './(home)/ProjectsSection';
import { SkillsSection } from './(home)/SkillsSection';
export default function Page() {
  return (
    <Main className='text-center'>
      <HeroSection id='hero' />
      <SkillsSection id='skills' />
      <ProjectsSection id='projets' />
      <ContactSection id='contact' />
    </Main>
  );
}
