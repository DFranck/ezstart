'use client';
import { SectionContact } from '@/app/[locale]/(home)/section-contact';
import { SectionTrust } from '@/app/[locale]/(home)/section-trust';
import { SectionVision } from '@/app/[locale]/(home)/section-vision';
import { Badge } from '@/components/Badge';
import { Button, Main } from '@ezstart/ui/components';
import Link from 'next/link';
import AboutSection from './(home)/AboutSection';
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
      {/* Confiance */}
      <section
        id='confiance'
        className='max-w-4xl mx-auto text-center space-y-4'
      >
        <h2 className='text-3xl font-semibold'>Ils m'ont fait confiance</h2>
        <p className='text-gray-600 dark:text-gray-400'>
          J’ai collaboré avec des startups en France, au Canada et aux
          États-Unis — sur des projets allant de l’audit technique à la
          construction de plateforme SaaS from scratch.
        </p>
        <div className='flex justify-center gap-4 mt-4 flex-wrap'>
          <Badge label='15+ projets techniques' />
          <Badge label='Full TypeScript / CI Ready' />
          <Badge label='Stack validée & modulaire' />
        </div>
      </section>

      {/* Contact */}
      <section
        id='contact'
        className='max-w-3xl mx-auto text-center space-y-6 py-20'
      >
        <h2 className='text-3xl font-semibold'>Vous avez un projet&nbsp;?</h2>
        <p className='text-gray-600 dark:text-gray-400'>
          Je suis disponible pour des missions ponctuelles, un accompagnement
          CTO, ou la création de bases techniques robustes. Parlons de vos
          objectifs, et voyons comment EzStart peut vous aider.
        </p>
        <div className='flex justify-center gap-4 flex-wrap'>
          <a href='mailto:franck.dufournet@gmail.com'>
            <Button>Me contacter</Button>
          </a>
          <a
            href='https://www.linkedin.com/in/franck-dufournet-239446151/'
            target='_blank'
            rel='noopener noreferrer'
          >
            <Button variant='ghost'>LinkedIn</Button>
          </a>
          <Link href='/contact'>
            <Button variant='outline'>Plus d'infos</Button>
          </Link>
        </div>
      </section>

      <SectionVision />
      <SectionTrust />
      <SectionContact />
      {/* Footer */}
      <footer className='text-center text-gray-400 text-sm py-12'>
        © 2025 EzStart LLC – Registered in Wyoming, USA. All rights reserved.
        <br />
        <Link href='/mentions-legales' className='underline'>
          Mentions légales
        </Link>
      </footer>
    </Main>
  );
}
