import { Main } from '@ezstart/ui/components';
import ContactSection from './(home)/ContactSection';
import HeroSection from './(home)/HeroSection';
import LibsSection from './(home)/LibsSection';
import ProjectsSection from './(home)/ProjectsSection';
import { SkillsSection } from './(home)/SkillsSection';
export default function Page() {
  return (
    <Main className='text-center overflow-hidden'>
      <HeroSection id='hero-home' />
      <SkillsSection id='skills-home' />
      <ProjectsSection id='projets-home' />
      <LibsSection id='libs-home' />
      <ContactSection id='contact-home' />
    </Main>
  );
}
