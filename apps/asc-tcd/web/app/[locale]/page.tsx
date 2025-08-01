'use client';

import {
  Button,
  Div,
  H2,
  Hero,
  Icon,
  Main,
  P,
  Section,
} from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import Image from 'next/image';
import Link from 'next/link';

export default function Page() {
  const { isDesktop, isMobile } = useDevice();
  return (
    <Main>
      {/* Hero Section */}
      <Hero
        title='Solution environmental pensée et crées pour vous'
        subtitle='ASC'
        videoSrc='/videos/hero-background-web.mp4'
        // overlay={false}
      />
      {/* Services Section */}
      <Section layout={'grid'} className='md:grid-cols-2'>
        <Div className='relative aspect-auto hidden md:block' size={'full'}>
          <Image
            src='/images/benefice.jpg'
            alt='ASC Logo'
            width={500}
            height={750}
            className='rounded-md'
          />
        </Div>
        <Div size='xs'>
          <H2 className='text-3xl font-bold'>Que faisons-nous ?</H2>
          <P className='mt-4'>
            ASC est une agence-conseil en urbanisme et développement de
            politique territoriale durable qui intervient à toutes les échelles
            de territoires : de l’ilot à l'agglomération.
          </P>
          <P className='mt-2'>
            Nous intervenons de façon transversale ou isolée sur les thèmes de
            l’urbanisme, de l’habitat, de la mobilité, de l’environnement et
            surtout des arbres, thématiques indissociables pour une stratégie
            durable.
          </P>

          {/* CTA Buttons */}
          <Div size={'xs'} layout={'row'} className='flex-wrap justify-center'>
            {/* <Button asChild variant='ghost'>
              <Link href='/calculatrice-sequestration-carbone'>
                <Icon name='lucide:Calculator' className='mr-2' />
                Calculatrice ECP
              </Link>
            </Button> */}
            <Button asChild variant='outline'>
              <Link href='/transplantation-d-arbres'>
                <Icon name='lucide:TreePine' className='mr-2' />
                Transplantation
              </Link>
            </Button>
            {/* <Button asChild>
              <Link href='/consulting'>
                <Icon name='fa:FaUserFriends' className='mr-2' />
                Consulting
              </Link>
            </Button> */}
          </Div>
        </Div>
      </Section>

      {/* Contact Section */}
      <Section className='py-12 text-center'>
        <H2 className='text-3xl font-bold'>Contactez-nous</H2>
        <P className='mt-2'>
          Pour toute question, n'hésitez pas à nous contacter.
        </P>
        <Button asChild className='mt-4'>
          <Link href='mailto:as-tsc'>
            <Icon name='lucide:Mail' className='mr-2' />
            Contact
          </Link>
        </Button>
      </Section>
    </Main>
  );
}
