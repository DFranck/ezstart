'use client'

import BoutiqueCta from '@/components/BoutiqueCta'
import { ACarousel, Button, Div, H2, Hero, Main, P, Section } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function PageTransplantationArbres(): any {
  const { isDesktop } = useDevice()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting && !video.paused) {
          video.pause()
        }
      },
      { threshold: 0.25 } // Ajuste selon la zone visible avant de stopper
    )

    observer.observe(video)

    return () => {
      observer.unobserve(video)
    }
  }, [])
  const carouselSlides: any[] = [
    {
      title: 'Particulier',
      src: '/images/particulier.jpg',
      button: <Link href="/quote">Demander un devis</Link>,
    },
    {
      title: 'Acteur public',
      src: '/images/secteur-public.jpg',
      button: <Link href="/quote">Demander un devis</Link>,
    },
    {
      title: 'Professionnel',
      src: '/images/professionnel.jpg',
      button: <Link href="/quote">Demander un devis</Link>,
    },
  ]

  return (
    <Main>
      {/* HERO */}
      <Hero
        title={
          <span className="text-black">
            Transplantation d’arbres matures et déplacement d'arbres sur chantier.
          </span>
        }
        subtitle={
          <span className="text-black" style={{ fontFamily: `'Cambria', Georgia, serif` }}>
            ASC
          </span>
        }
        // textureSrc='/images/fond-noisy.jpg'
        imageSrc="/images/hero-transplantation.jpg"
        overlay={false}
      ></Hero>

      <Section layout={'grid'}>
        <Div size={'default'}>
          <video
            src="/videos/petite-transplanteuse-web.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="rounded-md shadow-lg"
            poster="/images/petite-transplanteuse-poster.jpg"
          />
        </Div>
        <Div className="text-center">
          <P>
            La transplantation d’arbres matures permet de sauvegarder le patrimoine arboré existant
            tout en accompagnant les projets urbains.
          </P>
          <P>
            Sur chantier ou en milieu naturel. ASC TCD assure le déplacement et la reprise racinaire
            de l’arbre.
          </P>
          <BoutiqueCta />
        </Div>
      </Section>
      <Section layout={'grid'} className="max-w-7xl mx-auto">
        <Div size={'xs'}>
          <H2 className="text-3xl font-bold leading-snug">
            Transplantation de platane en Nouvelle-Aquitaine
          </H2>
          <P variant={'description'}>Bergerac, 2023</P>
          <P>Besoin de déplacer un arbre adulte ?</P>
          <Button asChild>
            <Link href="/quote">Demander un devis</Link>
          </Button>
        </Div>
        <Div size={'default'} className="relative aspect-video">
          <video
            ref={videoRef}
            src="/videos/bergerac-2023-web.mp4"
            poster="/images/bergerac-2023-web.png"
            controls
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
        </Div>
      </Section>

      <Section className="py-12 text-center">
        <H2 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Pourquoi transplanter un arbre plutôt que l’abattre ?
        </H2>

        {/* ✅ Conteneur scrollable sur mobile */}
        <div className="mt-8 w-full overflow-x-auto">
          <div className="flex justify-center">
            <table className="border border-gray-200 text-left text-xs sm:text-sm rounded-lg overflow-hidden min-w-[700px]">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="p-3 border whitespace-nowrap">Critères</th>
                  <th className="p-3 border whitespace-nowrap">Abattage de l’arbre</th>
                  <th className="p-3 border whitespace-nowrap">Déplacement de l’arbre</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    critere: 'Image écologique du projet',
                    abattage: 'Dégradée',
                    deplacement: 'Valorisée',
                  },
                  {
                    critere: 'Coût environnemental du projet',
                    abattage: 'Élevé',
                    deplacement: 'Réduit',
                  },
                  {
                    critere: 'Acceptation citoyenne',
                    abattage: 'Faible, voire rejet du projet',
                    deplacement: 'Forte à modérée selon la communication sur le projet',
                  },
                  {
                    critere: 'Intégration dans le projet urbain',
                    abattage:
                      '⚠️ Compensation symbolique, sans équivalence écologique ni paysagère',
                    deplacement: 'Très élevé, bienfaits immédiats esthétiques et écologiques',
                  },
                  {
                    critere: 'Conservation du patrimoine arboré',
                    abattage: '✗',
                    deplacement: '✓',
                  },
                  {
                    critere: 'Réduction des îlots de chaleur',
                    abattage: 'Bénéfices différés à long terme (20–30 ans)',
                    deplacement: 'Immédiat',
                  },
                  {
                    critere: 'Préservation de la biodiversité locale',
                    abattage: '✗',
                    deplacement: '✓',
                  },
                  {
                    critere: 'Séquestration carbone de l’arbre',
                    abattage: 'Rupture du stockage + libération de CO₂ selon le devenir du bois',
                    deplacement: 'Maintien du stockage + poursuite naturelle de la séquestration',
                  },
                ].map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-200">
                    {/* ✅ Largeur auto + nowrap sur mobile */}
                    <td className="p-3 border font-medium whitespace-nowrap">{row.critere}</td>
                    <td
                      className={cn(
                        'p-3 border whitespace-normal',
                        row.abattage.includes('✗') || row.abattage === 'Élevé'
                          ? 'text-red-500 font-semibold'
                          : 'text-red-500'
                      )}
                    >
                      {row.abattage}
                    </td>
                    <td
                      className={cn(
                        'p-3 border whitespace-normal',
                        row.deplacement.includes('✓') || row.deplacement === 'Immédiat'
                          ? 'text-green-600 font-semibold'
                          : 'text-green-600'
                      )}
                    >
                      {row.deplacement}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Texte explicatif */}
        <P className="mt-6 text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
          Lorsqu’un arbre adulte se trouve sur le tracé d’un projet urbain, deux options s’opposent
          : l’abattage ou la transplantation. Voici une comparaison claire des impacts
          environnementaux, techniques et sociaux pour vous aider à faire un choix éclairé.
        </P>
      </Section>

      {/* <Section layout={'grid'}>
        <Div></Div>
        <Div></Div>
      </Section> */}

      {/* Prestations */}
      <Section className="overflow-hidden pb-20">
        <H2 className="text-center text-3xl font-bold">Prestations</H2>
        <P className="text-center mt-2">
          Besoin d’enlever, déplacer ou réadapter un arbre adulte, TRANSPLANTEZ-LE !
        </P>
        <ACarousel slides={carouselSlides} />
      </Section>
    </Main>
  )
}
