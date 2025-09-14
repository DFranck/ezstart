/* path: /app/page.tsx */
'use client'

import ClientLayout from '@/components/ClientLayout'
import { Button, Card, CardContent, Icon, KnownIconName } from '@ezstart/ui/components'
import Link from 'next/link'

export default function HomePage() {
  const features = [
    {
      icon: 'lucide:Home',
      title: 'Analyse Personnalisée',
      description: 'Importez le plan de votre maison ou appartement pour une analyse sur mesure',
    },
    {
      icon: 'lucide:Compass',
      title: 'Orientation Précise',
      description: 'Alignez votre plan avec les points cardinaux pour une lecture authentique',
    },
    {
      icon: 'lucide:Sparkles',
      title: 'Les 9 Secteurs',
      description: 'Découvrez les énergies de chaque zone de votre espace de vie',
    },
    {
      icon: 'lucide:FileText',
      title: 'Rapport PDF',
      description: 'Obtenez une analyse détaillée avec recommandations pratiques',
    },
  ]

  const sectors = [
    {
      name: 'Carrière',
      colorClass: 'bg-chart-2',
      description: 'Votre parcours professionnel',
    },
    {
      name: 'Sagesse',
      colorClass: 'bg-ezstart',
      description: 'Apprentissage et croissance',
    },
    {
      name: 'Famille',
      colorClass: 'bg-success',
      description: 'Relations familiales',
    },
    {
      name: 'Prospérité',
      colorClass: 'bg-chart-4',
      description: 'Abondance et richesse',
    },
    {
      name: 'Réputation',
      colorClass: 'bg-destructive',
      description: 'Image et reconnaissance',
    },
    { name: 'Relations', colorClass: 'bg-chart-5', description: 'Amour et partenariats' },
    {
      name: 'Créativité',
      colorClass: 'bg-warning',
      description: 'Enfants et projets',
    },
    { name: 'Aide', colorClass: 'bg-muted-foreground', description: 'Mentors et voyages' },
    { name: 'Santé', colorClass: 'bg-chart-1', description: 'Centre et équilibre' },
  ]

  return (
    <ClientLayout>
      <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-info/20 to-ezstart/20" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-ezstart to-info bg-clip-text text-transparent mb-6">
              🏮 Feng Shui Bagua
            </h1>
            <p className="text-2xl text-foreground/80 mb-8">
              Harmonisez votre espace de vie selon les principes millénaires du Feng Shui
            </p>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Découvrez comment l'énergie circule dans votre maison et optimisez chaque zone pour
              améliorer votre bien-être, vos relations et votre prospérité.
            </p>
            <Link href="/analyze">
              <Button
                size="sm"
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <Icon name="lucide:Sparkles" className="mr-2" />
                Commencer l'Analyse
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
          Comment ça fonctionne ?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-accent to-secondary w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                  <Icon name={feature.icon as KnownIconName} className="h-8 w-8 text-ezstart" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sectors Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-foreground">Les 9 Secteurs du Bagua</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chaque secteur de votre maison influence un aspect spécifique de votre vie. Découvrez
            comment les optimiser.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {sectors.map((sector, idx) => (
            <div
              key={idx}
              className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className={`h-2 w-full rounded-full ${sector.colorClass} mb-4`} />
              <h3 className="font-semibold text-lg mb-1 text-card-foreground">{sector.name}</h3>
              <p className="text-sm text-muted-foreground">{sector.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="bg-card rounded-3xl shadow-xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-ezstart to-info bg-clip-text text-transparent">
            Prêt à transformer votre espace ?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Commencez votre analyse gratuite et découvrez comment le Feng Shui peut améliorer votre
            quotidien.
          </p>
          <Link href="/analyze">
            <Button size="sm" className="text-lg px-8 py-6">
              <Icon name="lucide:ArrowRight" className="mr-2" />
              Analyser Mon Espace
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p className="mb-2">🏮 Feng Shui Bagua - Harmonisez votre espace de vie</p>
            <p className="text-sm">Basé sur les principes traditionnels du Feng Shui chinois</p>
          </div>
        </div>
      </div>
    </div>
    </ClientLayout>
  )
}
