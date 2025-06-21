'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H1,
  H2,
  H3,
  Icon,
  LI,
  Main,
  P,
  Section,
  Span,
  UL,
} from '@ezstart/ui/components';
import Image from 'next/image';
import Link from 'next/link';

type TimelineItem = {
  year: string;
  title: string;
  description: string;
};

const timeline: TimelineItem[] = [
  {
    year: '2015',
    title: 'Premiers pas front-end',
    description: 'HTML, CSS, JS, jQuery. Premières interfaces.',
  },
  {
    year: '2018',
    title: 'Full-Stack confirmé',
    description: 'Node.js, Express, MongoDB, React. Freelance.',
  },
  {
    year: '2021',
    title: 'Lead Dev & CTO Freelance',
    description: 'Architecture, CI/CD, TDD, refontes complexes.',
  },
  {
    year: '2024',
    title: 'Création d’EzStart',
    description: 'Base technique scalable, composants & SaaS internes.',
  },
];

const skills = [
  'Next.js / React / Tailwind',
  'Node.js / tRPC / Prisma',
  'CI/CD (Vercel, Railway, GitHub Actions)',
  'Testing (Jest, Vitest)',
  'Design System & UI composables',
];

const values = [
  'Code lisible, typé, testé',
  'Architecture modulaire',
  'Types partagés front/back',
  'Performance & accessibilité',
];

const interests = [
  'SaaS B2B',
  'Blockchain utilitaire',
  'Finance éthique',
  'DevOps moderne',
];

export default function AboutPage() {
  return (
    <Main withHeaderOffset className='text-center'>
      {/* Intro */}
      <Section layout={'grid'}>
        <Div>
          <Image
            src='/images/franck_no_background.png'
            alt='Franck Dufournet'
            width={180}
            height={180}
            className='rounded-full shadow-md'
          />
        </Div>
        <Div className='text-justify'>
          <H1>À propos</H1>
          <P>
            Je suis Franck Dufournet, développeur fullstack & CTO freelance.
            J’aide les équipes tech à poser des bases solides, modernes et
            scalables — en combinant développement, architecture et stratégie
            produit.
          </P>
          <p className='text-lg leading-relaxed'>
            Mon approche est pragmatique, avec une attention particulière au
            typage, à la maintenabilité et à l’outillage DevOps.
          </p>
        </Div>
      </Section>

      {/* Timeline */}
      <Section>
        <H2 className='text-3xl font-semibold text-center '>Mon parcours</H2>
        <UL size={'default'} className='relative border-l border-border '>
          {timeline.map((item) => (
            <LI key={item.year} layout={'col'} className='pl-6 relative'>
              <Icon
                name='fa:FaCircle'
                size={12}
                className='text-success absolute left-0 top-1.5 '
              />
              <Span className='text-success font-mono'>{item.year}</Span>
              <H3 size={'h5'}>{item.title}</H3>
              <P variant={'description'}>{item.description}</P>
            </LI>
          ))}
        </UL>
      </Section>

      {/* Thématiques */}
      <Section>
        <H2>Mon approche</H2>
        <Div
          layout={'grid'}
          className='md:grid-cols-3 lg:grid-cols-3'
          size={'default'}
        >
          <CardFactory title='Compétences clés' items={skills} />
          <CardFactory title='Philosophie' items={values} />
          <CardFactory title='Sujets qui m’inspirent' items={interests} />
        </Div>
      </Section>

      {/* Outro */}
      <Section>
        <H2>Pourquoi EzStart&nbsp;?</H2>

        <P>
          EzStart est née d’un besoin concret&nbsp;: disposer d’un socle fiable
          et scalable pour démarrer les projets rapidement, sans sacrifier la
          qualité.
        </P>
        <P>
          Je m’en sers aujourd’hui pour mes missions client, mes composants
          open-source et mes projets SaaS.
        </P>
        <P intent={'info'}>
          Besoin d’un MVP&nbsp;? D’une refonte technique&nbsp;? D’un CTO
          externalisé&nbsp;? Parlons-en.
        </P>

        <Div>
          <Link href='/contact'>
            <Button variant='default' size='lg'>
              Me contacter →
            </Button>
          </Link>
        </Div>
      </Section>
    </Main>
  );
}

function CardFactory({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <UL layout={'menu'} size={'xs'}>
          {items.map((item) => (
            <LI key={item} className='flex items-start gap-2'>
              <Span className='text-success mt-[2px]'>▹</Span>
              <Span>{item}</Span>
            </LI>
          ))}
        </UL>
      </CardContent>
    </Card>
  );
}
