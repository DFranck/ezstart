/* path: /app/page.tsx */
'use client'

import {
  Button,
  Card,
  CardContent,
  Div,
  H1,
  H2,
  Icon,
  KnownIconName,
  P,
  Section,
  Span,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
  const [currentYear] = useState(new Date().getFullYear())

  const features = [
    {
      icon: 'lucide:Upload',
      title: '1. Téléchargez votre plan',
      description: 'Importez une image ou PDF de votre espace (JPG, PNG, PDF)',
      gradient: 'from-red-500 to-yellow-500',
    },
    {
      icon: 'lucide:Compass',
      title: '2. Orientez précisément',
      description: 'Alignez votre plan avec le Nord magnétique pour une analyse exacte',
      gradient: 'from-red-500 to-yellow-500',
    },
    {
      icon: 'lucide:Sparkles',
      title: '3. Découvrez votre Bagua',
      description: `Analyse complète ${currentYear} avec étoiles volantes et remèdes`,
      gradient: 'from-red-500 to-yellow-500',
    },
    {
      icon: 'lucide:Download',
      title: '4. Générez votre PDF',
      description: 'Rapport détaillé haute résolution adapté à votre theme',
      gradient: 'from-red-500 to-yellow-500',
    },
  ]

  // Vraies données des 9 secteurs avec leurs couleurs réelles
  const sectors = [
    {
      direction: 'N',
      name: 'Carrière et Mission de Vie',
      element: 'Eau',
      colors: ['#0D47A1', '#1565C0', '#2196F3', '#000000'],
      shape: 'lucide:Waves',
      description: 'Votre chemin professionnel et spirituel',
    },
    {
      direction: 'NE',
      name: 'Sagesse et Connaissance',
      element: 'Terre',
      colors: ['#BCA16A', '#F57C00', '#FFB300'],
      shape: 'lucide:Square',
      description: 'Apprentissage, méditation et croissance personnelle',
    },
    {
      direction: 'E',
      name: 'Famille et Ancêtres',
      element: 'Bois',
      colors: ['#2E7D32', '#388E3C', '#4CAF50', '#40E0D0'],
      shape: 'lucide:RectangleHorizontal',
      description: 'Relations familiales et héritage',
    },
    {
      direction: 'SE',
      name: 'Prospérité et Abondance',
      element: 'Bois',
      colors: ['#2E7D32', '#43A047', '#40E0D0'],
      shape: 'lucide:RectangleHorizontal',
      description: 'Richesse matérielle et spirituelle',
    },
    {
      direction: 'S',
      name: 'Réputation et Reconnaissance',
      element: 'Feu',
      colors: ['#D32F2F', '#F44336', '#FF5722'],
      shape: 'lucide:Triangle',
      description: 'Image publique et accomplissements',
    },
    {
      direction: 'SO',
      name: 'Relations et Amour',
      element: 'Terre',
      colors: ['#BCA16A', '#FFA726', '#FFCC80', '#A1887F'],
      shape: 'lucide:Square',
      description: 'Partenariats et relations amoureuses',
    },
    {
      direction: 'O',
      name: 'Créativité et Enfants',
      element: 'Métal',
      colors: ['#B0BEC5', '#CFD8DC', '#ECEFF1', '#FFD700'],
      shape: 'lucide:Circle',
      description: 'Projets créatifs et descendants',
    },
    {
      direction: 'NO',
      name: 'Aide et Mentors',
      element: 'Métal',
      colors: ['#B0BEC5', '#CFD8DC', '#ECEFF1', '#FFD700'],
      shape: 'lucide:Circle',
      description: 'Soutien spirituel et voyages',
    },
    {
      direction: 'Centre',
      name: 'Santé et Équilibre',
      element: 'Terre',
      colors: ['#FBC02D', '#FFEB3B', '#FFA000'],
      shape: 'lucide:Square',
      description: 'Centre vital et harmonie globale',
    },
  ]

  return (
    <>
      {/* Hero Section avec animation */}
      <Section size={'full'} className="pt-22 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {/* Gradient animé */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-transparent to-yellow-500/20 animate-pulse" />
          <div
            className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 via-transparent to-yellow-500/20 animate-pulse"
            style={{ animationDelay: '1s' }}
          />
        </div>
        {/* <div className="relative container mx-auto px-4 py-20"> */}
        <Div layout={'center'}>
          {/* Badge année */}
          <div className="inline-flex items-center gap-2">
            <Icon name="lucide:Calendar" className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-foreground">
              Configuration {currentYear}
            </span>
          </div>

          <H1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-red-500  to-yellow-500 bg-clip-text text-transparent">
              Feng Shui
            </span>
            <span className="text-foreground"> Bagua</span>
          </H1>

          <P>Harmonisez votre espace selon les 5 éléments et les 8 trigrammes</P>

          <P size={'sm'}>
            Analyse complète avec{' '}
            <span className="text-foreground font-semibold">étoiles volantes {currentYear}</span>,
            remèdes personnalisés et PDF haute résolution. Découvrez comment optimiser chaque
            secteur de votre habitat pour améliorer santé, prospérité et relations.
          </P>

          <Div layout={'grid'} size={'lg'}>
            <Link href="/analyze">
              <Button
                size="lg"
                className="bg-gradient-to-r from-red-500 to-yellow-500 hover:from-red-600 hover:to-yellow-600 text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <Icon name="lucide:Compass" className="mr-2 w-5 h-5" />
                Analyser Mon Espace
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="border-2"
              onClick={() =>
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <Icon name="lucide:Info" className="mr-2 w-5 h-5" />
              Comment ça marche
            </Button>
          </Div>
        </Div>
        {/* </div> */}
      </Section>

      {/* Features Section avec steps */}
      <div id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <H2 className="text-4xl font-bold mb-4 text-foreground">Processus Simple en 4 Étapes</H2>
          <P className="text-lg text-muted-foreground max-w-2xl mx-auto">
            De votre plan à votre analyse Feng Shui complète en quelques minutes
          </P>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <Card
              key={idx}
              className="group hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient}`}
              />
              <CardContent className="p-6 pt-8">
                <div
                  className={`bg-gradient-to-br ${feature.gradient} w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <Icon name={feature.icon as KnownIconName} className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sectors Grid avec vraies couleurs */}
      <Section size={'full'} className="bg-gradient-to-tr from-red-500/10 to-yellow-500/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <H2 className="text-4xl font-bold mb-4 text-foreground">Les 9 Secteurs du Bagua</H2>
            <P className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Chaque secteur correspond à une direction, un élément et un aspect de votre vie.
              L'analyse {currentYear} inclut les étoiles volantes pour des recommandations précises.
            </P>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {sectors.map((sector, idx) => (
              <Card
                key={idx}
                className="group hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden"
              >
                {/* Gradient bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{
                    background: `linear-gradient(90deg, ${sector.colors.join(', ')})`,
                  }}
                />

                <CardContent className="p-6 pt-8">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                        style={{
                          background: `linear-gradient(135deg, ${sector.colors[0]}, ${sector.colors[1]})`,
                        }}
                      >
                        <Icon name={sector.shape as KnownIconName} className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            {sector.direction}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${sector.colors[0]}20`,
                              color: sector.colors[0],
                            }}
                          >
                            {sector.element}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-foreground leading-tight mt-1">
                          {sector.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {sector.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA Section avec features */}
      <div className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-br from-card via-card to-muted/20 shadow-2xl overflow-hidden">
          <CardContent className="p-12 text-center relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 border border-success/30 mb-6">
                <Icon name="lucide:Zap" className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-foreground">100% Gratuit</span>
              </div>

              <H2 size={'giant'} className="flex flex-col items-center mb-4">
                <span className="bg-gradient-to-r from-red-500 via-yellow-500 to-yellow-500 bg-clip-text text-transparent">
                  Transformez
                </span>
                <Span size={'h3'}> votre espace de vie</Span>
              </H2>

              <div className="grid md:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
                <div className="flex flex-col items-center">
                  <Icon name="lucide:Star" className="w-8 h-8 text-yellow-500 mb-2" />
                  <span className="text-sm font-semibold text-foreground">
                    Étoiles Volantes {currentYear}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Icon name="lucide:Palette" className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-sm font-semibold text-foreground">
                    Support Dark/Light Mode
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Icon name="lucide:FileCheck" className="w-8 h-8 text-green-500 mb-2" />
                  <span className="text-sm font-semibold text-foreground">
                    PDF Haute Résolution
                  </span>
                </div>
              </div>

              <Link href="/analyze">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-red-500 to-yellow-500 hover:from-red-600 hover:to-yellow-600 text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <Icon name="lucide:Sparkles" />
                  <Span className="hidden md:inline">Commencer l'Analyse Maintenant</Span>
                  <Span className="md:hidden">Analyser</Span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
