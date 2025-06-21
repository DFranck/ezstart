'use client';
import { SectionContact } from '@/app/[locale]/(home)/section/section-contact';
import { SectionTrust } from '@/app/[locale]/(home)/section/section-trust';
import { SectionVision } from '@/app/[locale]/(home)/section/section-vision';
import { SectionHero } from '@/app/[locale]/(home)/section/SectionHero';
import { Badge } from '@/components/Badge';
import { ProjectCard } from '@/components/ProjectCard';
import { ServiceCard } from '@/components/ServiceCard';
import { Button, Main, Section } from '@ezstart/ui/components';
import Link from 'next/link';
import SectionAbout from './(home)/section/SectionAbout';
export default function Page() {
  return (
    <Main className='text-center'>
      <SectionHero />
      <SectionAbout />
      <Section id='expertise'>
        <h2 className='text-3xl font-semibold text-center'>Mon expertise</h2>
        <ul className='grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300'>
          <li>
            ⚙️ Architecture scalable et modulaire (monorepo, tRPC, Zod, Prisma)
          </li>
          <li>
            🚀 Livraison continue avec GitHub Actions, Docker, Vercel, CI/CD
          </li>
          <li>🧪 Code maintenable (testing, coverage, conventions strictes)</li>
          <li>
            🌐 Fullstack JavaScript / TypeScript (Next.js, Express, API
            REST/GraphQL)
          </li>
          <li>🔐 Intégration auth, RBAC, sécurité applicative</li>
          <li>🧠 Accompagnement technique en tant que CTO freelance</li>
        </ul>
      </Section>

      {/* Projets */}
      <section id='projets' className='max-w-5xl mx-auto space-y-6'>
        <h2 className='text-3xl font-semibold text-center'>Quelques projets</h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
          <ProjectCard
            title='EzStart — Starter moderne fullstack'
            description='Base de code complète pour démarrer un projet avec Next.js, Express, Prisma, Auth, CI/CD, tests.'
            link='https://github.com/DFranck/ezstart'
          />
          <ProjectCard
            title='Portfolio personnel'
            description='Site 100% statique optimisé pour SEO, en i18n et animable avec Framer Motion. Utilisé pour me présenter auprès de clients tech exigeants.'
            link='https://dfranck.netlify.app/'
          />
        </div>
      </section>

      {/* Services */}
      <section id='services' className='max-w-5xl mx-auto py-16 space-y-6'>
        <h2 className='text-3xl font-semibold text-center'>Mes services</h2>
        <p className='text-gray-600 dark:text-gray-400 text-center max-w-2xl mx-auto'>
          J'interviens à différents niveaux de maturité produit, que ce soit
          pour démarrer un projet, refondre une base technique ou accompagner
          une équipe dans la durée.
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
          <ServiceCard
            title='⚙️ Audit technique'
            description='Analyse de votre base existante, CI/CD, sécurité et architecture. Livrable documenté et recommandations.'
          />
          <ServiceCard
            title='🚀 Création de MVP'
            description='Déploiement rapide d’un socle solide : Auth, API, dashboard, tests, CI/CD, dev ready.'
          />
          <ServiceCard
            title='♻️ Refonte & clean architecture'
            description='Reprise structurée d’un existant pour le rendre stable, typé, scalable.'
          />
          <ServiceCard
            title='🧭 CTO as a Service'
            description='Support technique long-terme, revue de code, roadmap, coaching dev.'
          />
        </div>
        <div className='text-center pt-6'>
          <Link href='/services'>
            <Button variant='outline'>Voir tous les services</Button>
          </Link>
        </div>
      </section>

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
