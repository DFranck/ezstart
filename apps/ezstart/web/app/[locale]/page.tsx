'use client';
import { Main } from '@ezstart/ui/components';
import AboutSection from './(home)/AboutSection';
import ContactSection from './(home)/ContactSection';
import ExpertiseSection from './(home)/ExpertiseSection';
import { HeroSection } from './(home)/HeroSection';
import ProjectsSection from './(home)/ProjectsSection';
import ServicesSection from './(home)/ServicesSection';
export default function Page() {
  return (
    <Main className='text-center'>
      <HeroSection id='hero' />
      <AboutSection id='about' />
      <ExpertiseSection id='expertise' />
      <ProjectsSection id='projets' />
      <ServicesSection id='services' />
      <ContactSection id='contact' />
    </Main>
  );
}
