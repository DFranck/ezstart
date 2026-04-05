import { Main } from '@ezstart/ui/components'
import ContactSection from './(home)/ContactSection'
import HeroSection from './(home)/HeroSection'
import LibsSection from './(home)/LibsSection'
import ProjectsSection from './(home)/ProjectsSection'
import { SkillsSection } from './(home)/SkillsSection'
import SupportSection from './(home)/SupportSection'
export default function Page() {
  return (
    <Main className="text-center overflow-hidden">
      <HeroSection id="hero-home" />
      <SkillsSection id="skills-home" />
      <ProjectsSection id="projets-home" />
      <LibsSection id="libs-home" />
      <SupportSection id="support-home" />
      <ContactSection id="contact-home" />
    </Main>
  )
}
