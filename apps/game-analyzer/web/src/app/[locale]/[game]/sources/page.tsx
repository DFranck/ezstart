'use client'

import { useParams } from 'next/navigation'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,

  P,
  Span,
} from '@ezstart/ui/components'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Source {
  name: string
  url: string
  description: string
  access?: string
}

interface SourceCategory {
  id: string
  title: string
  description: string
  sources: Source[]
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SOURCE_CATEGORIES: SourceCategory[] = [
  {
    id: 'apis',
    title: 'APIs Publiques',
    description: 'APIs avec endpoints exploitables pour enrichir les données du scanner',
    sources: [
      {
        name: 'SWARFARM API',
        url: 'https://swarfarm.com/api/v2/',
        description:
          'Base de données complète : monstres, skills, données de jeu, profils publics. Utile pour croiser les stats de runes avec les besoins réels des monstres.',
        access: 'Gratuit, rate-limited, docs Swagger',
      },
      {
        name: 'SWSTATS API',
        url: 'https://swstats.info/api/',
        description:
          'Données agrégées de la communauté : monstres, runes, artefacts, builds contributeurs. Permet de valider nos calculs d\'efficacité contre les builds réels des joueurs.',
        access: 'Gratuit, docs Swagger',
      },
    ],
  },
  {
    id: 'rta-pvp',
    title: 'RTA & PvP Analytics',
    description: 'Statistiques compétitives pour contextualiser la valeur des runes',
    sources: [
      {
        name: 'Lucksack',
        url: 'https://lucksack.gg',
        description:
          'Pick/win/ban rates en RTA, compositions méta, outil de draft. Utile pour identifier quels monstres (et donc quels types de runes) sont méta.',
      },
      {
        name: 'Swarena',
        url: 'https://swarena.gg',
        description:
          'Stats RTA globales et personnelles, leaderboard, table des monstres. Référence pour les builds compétitifs et la validation des recommandations d\'archétypes.',
      },
      {
        name: 'Rosa Midman',
        url: 'https://rosa-midman.com/game-data/summoners-war-rta',
        description:
          'Analytics RTA par saison, siege rankings en live (refresh toutes les 5 min). Données fraîches pour suivre les tendances méta.',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Outils Communautaires',
    description: 'Outils complémentaires au scanner pour l\'optimisation',
    sources: [
      {
        name: 'SWOP (SW Optimizer)',
        url: 'https://tool.swop.one/',
        description:
          'Rune optimizer de référence : import JSON, builds optimaux, simulations. Notre scanner peut alimenter SWOP avec des données OCR pour optimiser sans export manuel.',
      },
      {
        name: 'SW Exporter (SWEX)',
        url: 'https://github.com/Xzandro/sw-exporter',
        description:
          'Export des données du jeu vers JSON (monstres, runes, artefacts). Format de référence pour l\'interopérabilité — notre scanner vise à reproduire ces données via OCR.',
      },
      {
        name: 'SWGT',
        url: 'https://swgt.io/',
        description:
          'Stats de Guild War et Siege, gestion de guilde. Utile pour comprendre le contexte PvP des runes (défenses, offenses).',
      },
      {
        name: 'SW Rune Builder',
        url: 'https://swrunebuilder.com/',
        description:
          'Simulateur de builds de runes. Permet de tester théoriquement des combinaisons avant d\'investir du mana.',
      },
    ],
  },
  {
    id: 'wikis',
    title: 'Wikis & Guides',
    description: 'Références pour les mécaniques de jeu et les valeurs de runes',
    sources: [
      {
        name: 'Fandom Wiki',
        url: 'https://summonerswar.fandom.com/wiki/Runes',
        description:
          'Database complète : monstres, skills, runes, mécaniques. Source de vérité pour les valeurs max/min des substats et les formules de calcul.',
      },
      {
        name: 'SWMasters',
        url: 'https://www.swmasters.com/blog/rune-guide',
        description:
          'Guides runes, farming, progression. Références utiles pour calibrer les seuils d\'efficacité par profil de progression (early/mid/endgame).',
      },
      {
        name: 'Theria Games',
        url: 'https://theriagames.com/guide/summoners-war-rune/',
        description:
          'Guides runes et gems. Détails sur les enchanted gems et grinds — utile pour nos calculs de potentiel post-optimisation.',
      },
      {
        name: 'Spokland',
        url: 'https://summonerswar.spokland.com/rune',
        description:
          'Database runes, substats, enchanted gems. Tables de valeurs de référence pour valider le parsing OCR.',
      },
      {
        name: 'SW Database',
        url: 'https://www.sw-database.com/',
        description:
          'Guides officiels, rune selling guide. Critères de sell/keep alignés avec notre système de recommandation.',
      },
    ],
  },
  {
    id: 'opensource',
    title: 'GitHub / Open Source',
    description: 'Code source et projets open source pour référence technique',
    sources: [
      {
        name: 'SWARFARM (code)',
        url: 'https://github.com/swarfarm/swarfarm',
        description:
          'Code source du site SWARFARM. Référence pour les structures de données, les formules de calcul et les conventions de nommage des stats.',
      },
      {
        name: 'SWSTATS (code)',
        url: 'https://github.com/QuatZo/swstats',
        description:
          'Big Data Summoners War. Algorithmes d\'agrégation de stats et modèles de données pour l\'analyse de runes à grande échelle.',
      },
      {
        name: 'SW Exporter',
        url: 'https://github.com/Xzandro/sw-exporter',
        description:
          'Data extractor/parser. Code de parsing de référence pour comprendre le format natif des données du jeu.',
      },
      {
        name: 'SWProxy',
        url: 'https://github.com/kakaroto/SWProxy',
        description:
          'Data extractor legacy. Projet historique, utile pour comprendre l\'évolution du format de données SW.',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function SourceCard({ source }: { source: Source }) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        <Div className="flex items-start justify-between gap-3">
          <Div className="flex-1 min-w-0">
            <Div className="flex items-center gap-2 mb-1.5">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sm text-primary hover:underline underline-offset-2 truncate"
              >
                {source.name}
              </a>
              {source.access && (
                <Badge variant="outline" className="text-[10px] shrink-0 border-border/60">
                  {source.access}
                </Badge>
              )}
            </Div>
            <P className="text-xs text-muted-foreground leading-relaxed mb-2">
              {source.description}
            </P>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground/70 hover:text-primary truncate block"
            >
              {source.url}
            </a>
          </Div>
        </Div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SourcesPage() {
  const params = useParams()
  const game = params.game as string

  if (game !== 'summoners-war') {
    return (
      <Div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <P className="text-2xl font-bold mb-4">Coming Soon</P>
        <P className="text-muted-foreground">
          Les sources de référence pour {game.replace(/-/g, ' ')} sont en cours de préparation.
        </P>
      </Div>
    )
  }

  return (
    <Div className="container mx-auto px-4 py-6 max-w-4xl">
      <Div className="mb-6">
        <P className="text-sm text-muted-foreground">
          Références externes utiles pour Summoners War — APIs, outils, wikis et projets open source
          qui alimentent ou complètent le scanner.
        </P>
      </Div>

      <Accordion type="multiple" defaultValue={SOURCE_CATEGORIES.map((c) => c.id)}>
        {SOURCE_CATEGORIES.map((category) => (
          <AccordionItem key={category.id} value={category.id}>
            <AccordionTrigger className="hover:no-underline">
              <Div className="flex items-center gap-3">
                <Span className="font-semibold">{category.title}</Span>
                <Badge variant="secondary" className="text-[10px]">
                  {category.sources.length}
                </Badge>
              </Div>
            </AccordionTrigger>
            <AccordionContent>
              <P className="text-xs text-muted-foreground mb-3">{category.description}</P>
              <Div className="grid gap-2">
                {category.sources.map((source) => (
                  <SourceCard key={source.name} source={source} />
                ))}
              </Div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Div>
  )
}
