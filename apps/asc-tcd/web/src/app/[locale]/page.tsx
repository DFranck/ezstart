'use client'

import { Button, Div, H2, Hero, Icon, Main, P, Section } from '@ezstart/ui/components'
import Image from 'next/image'
import Link from 'next/link'

export default function Page(): any {
  return (
    <Main>
      {/* Hero Section */}
      <Hero
        title="Solutions environnementales pensées et créées pour vous"
        subtitle={<span style={{ fontFamily: `'Cambria', Georgia, serif` }}>ASC</span>}
        imageSrc="/images/hero-home.jpg"
        paragraph={
          <span className="italic font-light mt-2 text-white">
            "Ne coupons plus les arbres, transplantons les"
          </span>
        }
        // overlay={false}
      />
      {/* Services Section */}
      <Section layout={'grid'} className="md:grid-cols-2">
        <Div className="relative aspect-auto hidden md:block" size={'full'}>
          <Image
            src="/images/benefice.jpg"
            alt="ASC Logo"
            width={500}
            height={750}
            className="rounded-md"
          />
        </Div>
        <Div size="xs">
          <H2 className="text-3xl font-bold">Que faisons-nous ?</H2>
          <P className="mt-4">
            ASC est une agence-conseil en urbanisme et développement de politique territoriale
            durable qui intervient à toutes les échelles de territoires : de l’ilot à
            l'agglomération.
          </P>
          <P className="mt-2">
            Nous intervenons de façon transversale ou isolée sur les thèmes de l’urbanisme, de
            l’habitat, de la mobilité, de l’environnement et surtout des arbres, thématiques
            indissociables pour une stratégie durable.
          </P>

          <Div className="relative aspect-auto mt-4 md:hidden scale-105" size={'full'}>
            <Image
              src="/images/benefice.jpg"
              alt="ASC Logo"
              width={500}
              height={750}
              className="rounded-md"
            />
          </Div>
          <P className="mt-2" variant={'description'}>
            "Ne coupons plus les arbres, transplantons les"
          </P>
          <img
            src={'/images/giphy.gif'}
            alt="Animation showing tree cutting process"
            className="rounded-md mt-4"
          />

          {/* CTA Buttons */}
          <Div size={'xs'} layout={'row'} className="flex-wrap justify-center">
            <Button asChild>
              <Link href="/transplantation-d-arbres">
                <Icon name="lucide:TreePine" className="mr-2" />
                Transplantation
              </Link>
            </Button>
          </Div>
        </Div>
      </Section>

      {/* Contact Section */}
      <Section className="py-12 text-center">
        <H2 className="text-3xl font-bold">Contactez-nous</H2>
        <P className="mt-2">Pour toute question, n'hésitez pas à nous contacter.</P>
        <Button asChild className="mt-4">
          <Link href="mailto:as-tsc">
            <Icon name="lucide:Mail" className="mr-2" />
            Contact
          </Link>
        </Button>
      </Section>
    </Main>
  )
}
