'use client';
import { Main } from '@ezstart/ui/components';
import ContactSection from './(home)/ContactSection';
import ProjectsSection from './(home)/ProjectsSection';
import HeroSection from './(views)/(statics)/about/HeroSection';
import { SkillsSection } from './(views)/(statics)/about/SkillsSection';
export default function Page() {
  return (
    <Main className='text-center'>
      <HeroSection id='hero' />
      <SkillsSection id='skills' />
      {/* <AboutSection id='about' /> */}
      {/* <ExpertiseSection id='expertise' /> */}
      <ProjectsSection id='projets' />
      {/* <ServicesSection id='services' /> */}
      <ContactSection id='contact' />
    </Main>
  );
}
