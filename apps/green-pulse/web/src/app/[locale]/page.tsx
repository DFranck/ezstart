'use client'

import {
  Button,
  Card,
  H1,
  H2,
  H3,
  Icon,
  Input,
  KnownIconName,
  P,
  Section,
} from '@ezstart/ui/components'
import { useState } from 'react'

export default function HomePage() {
  const [email, setEmail] = useState('')

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Handle email submission
    console.log('Email submitted:', email)
    alert('Merci ! Vous serez notifié dès le lancement de GreenPulse.AI')
    setEmail('')
  }

  return (
    <>
      {/* Hero Section */}
      <Section
        size={'full'}
        className="dark:bg-gradient-to-br dark:from-green-900 dark:to-blue-900 bg-gradient-to-br from-green-50 to-blue-50"
      >
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <H1 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              GreenPulse.AI
            </H1>
            <H2 className="text-2xl lg:text-3xl font-semibold mb-4">
              Votre Assistant ESG pour la Croissance Verte des Entreprises
            </H2>
            <P className="text-lg lg:text-xl mb-8 max-w-3xl mx-auto text-muted-foreground">
              Un accompagnement basé sur l'IA pour aider les PME à réduire leurs coûts, développer
              un marketing vert solide et accéder à la finance verte.
            </P>

            <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
              <P className="text-lg font-medium mb-4">
                Soyez le premier informé de notre lancement et bénéficiez d'une version d'essai
                gratuite
              </P>
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-4">
                <Input
                  type="email"
                  placeholder="Votre adresse e-mail"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-primary-foreground font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Prévenez-moi
                </Button>
              </form>
            </div>
          </div>
        </div>
      </Section>

      {/* Value Proposition Section */}
      <Section size={'xl'}>
        <div className="container mx-auto">
          <Card className="max-w-4xl mx-auto p-8 lg:p-12 border-l-4 border-primary">
            <P className="text-lg lg:text-xl  mb-6 leading-relaxed">
              Avec GreenPulse.AI, pas besoin d'être un expert environnemental ou d'en embaucher un.
              Grâce à une simple conversation avec votre assistant personnalisé, vous recevrez des
              conseils étape par étape pour :
            </P>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: 'lucide:MessageCircle',
                  text: 'Discuter de votre situation actuelle et trouver des solutions simples',
                },
                { icon: 'lucide:Gauge', text: 'Mesurer votre empreinte carbone' },
                {
                  icon: 'lucide:TrendingUp',
                  text: "Améliorer l'efficacité et économiser de l'argent",
                },
                {
                  icon: 'lucide:Target',
                  text: 'Élaborer des feuilles de route de durabilité avec des KPI',
                },
                {
                  icon: 'lucide:Banknote',
                  text: "Vous qualifier pour des prêts verts et des opportunités d'exportation",
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Icon
                    name={item.icon as KnownIconName}
                    className="w-6 h-6 text-primary mt-1 flex-shrink-0"
                  />
                  <P className="">{item.text}</P>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* Example Interaction Section */}
      <Section
        size={'xl'}
        className="max-w-full bg-gradient-to-br from-green-50 to-blue-50 dark:bg-gradient-to-br dark:from-green-900 dark:to-blue-900"
      >
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <H3 className="text-3xl font-bold text-center mb-12">Exemple d'interaction</H3>
            <Card className="p-8 space-y-6">
              <div className="bg-muted/50 p-6 rounded-xl border-l-4 border-primary">
                <div className="flex items-start space-x-3">
                  <Icon name="lucide:User" className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <P className="font-semibold text-primary mb-2">Utilisateur:</P>
                    <P className="">
                      Je gère 4 cliniques esthétiques à HCMC avec 15 employés et 10 machines. Je
                      souhaite réduire mes factures d'électricité et attirer des clients exigeants
                      en produits de qualité et amoureux de la nature. Pouvez-vous m'aider?
                    </P>
                  </div>
                </div>
              </div>

              <div className="bg-accent/50 p-6 rounded-xl border-l-4 border-accent-foreground">
                <div className="flex items-start space-x-3">
                  <Icon name="lucide:Bot" className="w-6 h-6 text-accent-foreground mt-1" />
                  <div>
                    <P className="font-semibold text-accent-foreground mb-2">GreenPulse.AI:</P>
                    <P className="">
                      Bonjour Mme Hang, oui je peux certainement vous aider dans vos objectifs de
                      croissance durable. Passons en revue vos dépenses actuelles et vos inventaires
                      de matériel. Pouvez-vous préciser si vous souhaitez faire du marketing avec
                      vos actions ou simplement rester discret ? Envisagez-vous également une levée
                      de fonds via la finance verte dans un futur proche ?
                    </P>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Section>

      {/* Packages Section */}
      <Section size={'full'}>
        <div className="container mx-auto">
          <H3 className="text-4xl font-bold text-center mb-16">Nos Offres</H3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Free Package */}
            <Card className="p-8 border-2 hover:border-primary transition-colors duration-200">
              <div className="text-center mb-6">
                <Icon
                  name="lucide:MessageCircle"
                  className="w-12 h-12 text-muted-foreground mx-auto mb-4"
                />
                <H3 className="text-2xl font-bold mb-2">Free Use</H3>
                <P className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Pour les explorateurs de l'ESG
                </P>
              </div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                Je veux discuter d'économies d'énergie, d'actions ESG simples, je découvre/explore
                ce que je peux faire et améliorer dans mon entreprise d'un point de vue durable.
              </P>

              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <Icon name="lucide:MessageCircle" className="w-5 h-5 text-primary" />
                  <span className="">Plateforme de chat IA</span>
                </li>
              </ul>
            </Card>

            {/* Premium Package */}
            <Card className="p-8 border-2 border-primary/30 bg-gradient-to-b from-green-50 to-white relative dark:bg-gradient-to-b dark:from-green-900 dark:to-gray-900">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Populaire
                </span>
              </div>

              <div className="text-center mb-6">
                <Icon name="lucide:TrendingUp" className="w-12 h-12 text-primary mx-auto mb-4" />
                <H3 className="text-2xl font-bold text-foreground mb-2">Premium Package</H3>
                <P className="text-sm font-medium text-primary uppercase tracking-wide">
                  Pour une croissance stimulée par l'ESG
                </P>
              </div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                Je veux utiliser des actions durables et vertes pour stimuler mon activité grâce à
                un marketing vert sur mesure, éviter le greenwashing et avoir des KPI solides pour
                mes clients.
              </P>

              <ul className="space-y-3">
                {[
                  { icon: 'lucide:MessageCircle', text: 'Plateforme de chat IA' },
                  { icon: 'lucide:BarChart3', text: 'Accès aux outils ESG avec tableau de bord' },
                  { icon: 'lucide:Upload', text: 'Importation de données (docs, voix, images)' },
                  { icon: 'lucide:PieChart', text: 'Analyse de données et diagrammes' },
                  { icon: 'lucide:ClipboardList', text: "Plans d'action sur mesure" },
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Icon name={item.icon as KnownIconName} className="w-5 h-5 text-primary" />
                    <span className=" text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Golden Package */}
            <Card className="p-8 border-2 border-amber-300 bg-gradient-to-b from-yellow-50 to-white dark:bg-gradient-to-b dark:from-yellow-900 dark:to-gray-900">
              <div className="text-center mb-6">
                <Icon name="lucide:Award" className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <H3 className="text-2xl font-bold text-foreground mb-2">Golden Package</H3>
                <P className="text-sm font-medium text-amber-600 uppercase tracking-wide">
                  Pour une certification ESG officielle
                </P>
              </div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                J'ai besoin d'un rapport/dossier/audit ESG solide et officiel pour la certification
                ISO / l'exportation internationale / l'accès à la finance verte.
              </P>

              <ul className="space-y-3">
                {[
                  { icon: 'lucide:Star', text: 'Toutes les fonctionnalités Premium' },
                  {
                    icon: 'lucide:Handshake',
                    text: 'Support sur mesure pour normes officielles/internationales',
                  },
                  { icon: 'lucide:UserCheck', text: 'Remplace ou soutient le responsable ESG' },
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Icon name={item.icon as KnownIconName} className="w-5 h-5 text-amber-500" />
                    <span className=" text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </Section>

      {/* Bottom CTA Section */}
      <Section size={'xl'} className="max-w-full bg-gradient-to-r from-green-600 to-blue-600 ">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <H3 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
              GreenPulse.AI sera bientôt lancé
            </H3>
            <P className="text-xl text-primary-foreground/90 mb-8">
              Inscrivez-vous pour recevoir des mises à jour exclusives et un accès GRATUIT anticipé.
            </P>

            <form
              onSubmit={handleEmailSubmit}
              className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
            >
              <Input
                type="email"
                placeholder="Votre adresse e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="flex-1 bg-white"
              />
              <Button
                type="submit"
                className="bg-background text-primary hover:bg-background/80 font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Rejoignez la liste d'attente
              </Button>
            </form>
          </div>
        </div>
      </Section>
    </>
  )
}
