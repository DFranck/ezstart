'use client';

import {
  Button,
  Div,
  H2,
  Icon,
  Main,
  P,
  Section,
} from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';
import Image from 'next/image';
import Link from 'next/link';
import HeroSection from './(home)/HeroSection';

export default function Page() {
  const { isDesktop } = useDevice();
  return (
    <Main withHeaderOffset className={cn({ 'mt-32': isDesktop })}>
      {/* Hero Section */}
      <HeroSection />

      {/* Services Section */}
      <Section layout={'grid'} className='md:grid-cols-2'>
        <Div className='relative aspect-video ' size={'full'}>
          <Image
            src='/images/image.png'
            alt='ASC Logo'
            fill
            className='mx-auto'
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
          <div className='flex justify-center gap-4 mt-6'>
            <Button asChild variant='ghost'>
              <Link href='/calculatrice-sequestration-carbone'>
                <Icon name='lucide:Calculator' className='mr-2' />
                Calculatrice ECP
              </Link>
            </Button>
            <Button asChild variant='outline'>
              <Link href='/transplantation-d-arbres'>
                <Icon name='lucide:TreePine' className='mr-2' />
                Transplantation
              </Link>
            </Button>
            <Button asChild>
              <Link href='/consulting'>
                <Icon name='fa:FaUserFriends' className='mr-2' />
                Consulting
              </Link>
            </Button>
          </div>
        </Div>
      </Section>

      {/* Engagements */}
      <Section className='bg-gray-50 py-12 text-center'>
        <H2 className='text-3xl font-bold'>Nos engagements</H2>
        <P className='mt-4 max-w-2xl mx-auto'>
          ASC TCD s'engage à fournir des solutions innovantes et durables pour
          un avenir plus vert. Nous sommes dédiés à la préservation de
          l'environnement et à la création de villes résilientes.
        </P>
      </Section>

      {/* Contact Section */}
      <Section className='py-12 text-center'>
        <H2 className='text-3xl font-bold'>Contactez-nous</H2>
        <P className='mt-2'>
          Pour toute question ou demande de devis, n'hésitez pas à nous
          contacter.
        </P>
        <Button asChild className='mt-4'>
          <Link href='https://www.asc-tcd.com/contact'>
            <Icon name='lucide:Mail' className='mr-2' />
            Contact
          </Link>
        </Button>
      </Section>
    </Main>
  );
}
