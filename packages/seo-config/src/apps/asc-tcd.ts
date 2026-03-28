/**
 * Enhanced SEO Configuration for ASC-TCD
 *
 * Modern website for the Théâtre Compagnie Duende association - cultural events and performances.
 * Data extracted from docs/seo/ALL-APPS-SUMMARY.md
 */

import type { AppSEOConfig } from './ezstart'

export const ascTcdSEO: AppSEOConfig = {
  appName: 'ASC-TCD',
  tagline: 'Théâtre Compagnie Duende - Arts & Culture à Bergerac',
  shortDescription: 'Association culturelle présentant spectacles, actualités et événements théâtraux à Bergerac.',
  longDescription: `ASC-TCD (Association Théâtre Compagnie Duende) est une association culturelle de Bergerac (Dordogne, France) dédiée aux arts du spectacle vivant. Notre site web moderne présente nos créations théâtrales, nos actualités culturelles, et notre calendrier d'événements. Fondée sur la passion du théâtre et l'engagement communautaire, la Compagnie Duende produit et présente des spectacles de qualité dans la région Nouvelle-Aquitaine. Le site offre un calendrier des représentations à venir avec réservation en ligne, une galerie multimédia avec photos et vidéos de nos spectacles, des actualités sur la vie de la compagnie et les événements culturels, des présentations de nos créations et de l'équipe artistique, et des informations d'adhésion et de soutien à l'association. Construit avec les technologies web modernes (Next.js, TypeScript), le site est rapide, accessible (WCAG compliant), mobile-friendly, et multilingue (français/anglais). Notre mission est de rendre le théâtre accessible au plus grand nombre, soutenir la création artistique locale, contribuer au dynamisme culturel de Bergerac et sa région, et créer des liens entre artistes et public. Que vous soyez amateur de théâtre, artiste, ou simplement curieux, découvrez nos spectacles et rejoignez notre communauté culturelle.`,

  mission: {
    what: 'Site web moderne pour l\'association théâtrale Compagnie Duende à Bergerac.',
    why: 'Les associations culturelles ont besoin d\'une présence numérique professionnelle pour toucher leur public et promouvoir leurs événements.',
    how: 'Fournir un site web rapide, accessible, et moderne qui met en valeur les spectacles et facilite la découverte culturelle.',
  },

  features: [
    {
      title: 'Calendrier des Spectacles - Événements à Venir',
      description: 'Découvrez nos prochaines représentations et réservez en ligne',
      longDescription: 'Notre calendrier présente tous les événements à venir de la Compagnie Duende: dates et lieux des représentations, descriptions détaillées des spectacles, tarifs et modalités de réservation, informations pratiques (accès, horaires, etc.). Interface intuitive pour parcourir les événements par mois, filtrer par type de spectacle ou lieu, et accéder rapidement aux informations importantes. Système de réservation intégré pour faciliter l\'achat de billets. Notifications pour ne manquer aucune représentation de vos spectacles favoris.',
      icon: 'lucide:Calendar',
      keywords: ['spectacle bergerac', 'théâtre dordogne', 'événements culturels', 'calendrier spectacles', 'réservation théâtre'],
      useCases: [
        'Public local cherchant des sorties culturelles à Bergerac',
        'Touristes planifiant leur visite en Dordogne',
        'Amateurs de théâtre suivant la programmation',
      ],
    },
    {
      title: 'Galerie Multimédia - Photos & Vidéos',
      description: 'Revivez nos spectacles à travers images et vidéos',
      longDescription: 'Notre galerie multimédia archive les moments forts de nos créations: photos professionnelles des représentations, vidéos d\'extraits de spectacles, captations complètes de certaines pièces, images des répétitions et coulisses, portraits de l\'équipe artistique. Organisation par spectacle, par année, ou par type de média. Qualité optimisée pour le web (WebP, compression) assurant chargement rapide même sur mobile. Galerie responsive qui s\'adapte à tous les écrans. Parfait pour découvrir l\'univers de la compagnie avant de venir voir un spectacle.',
      icon: 'lucide:Image',
      keywords: ['photos spectacles', 'vidéos théâtre', 'galerie culturelle', 'compagnie duende photos', 'archives spectacles'],
      useCases: [
        'Découvrir le style artistique de la compagnie',
        'Se remémorer des spectacles passés',
        'Partager sur réseaux sociaux pour promouvoir',
      ],
    },
    {
      title: 'Actualités & Blog - Vie de la Compagnie',
      description: 'Suivez nos dernières nouvelles et articles culturels',
      longDescription: 'Notre section actualités partage la vie de l\'association: annonces de nouvelles créations et premières, articles sur le processus de création artistique, interviews des membres de la troupe, reportages sur les représentations et festivals, réflexions sur les arts du spectacle, informations sur les ateliers et stages proposés. Système de blog moderne avec catégories, tags, recherche, et archives. Abonnement newsletter pour recevoir les actualités par email. Partage facile sur réseaux sociaux pour amplifier la visibilité.',
      icon: 'lucide:Newspaper',
      keywords: ['actualités théâtre', 'blog culturel', 'news compagnie duende', 'articles spectacle', 'vie culturelle bergerac'],
      useCases: [
        'Membres de l\'association restant informés',
        'Passionnés de théâtre suivant les créations',
        'Journalistes culturels couvrant les événements',
      ],
    },
  ],

  targetAudience: [
    {
      persona: 'Amateurs de Théâtre Locaux (Bergerac et région)',
      painPoints: [
        'Difficile de trouver les événements culturels locaux',
        'Informations dispersées sur plusieurs sites',
        'Pas de moyen simple de réserver des billets',
        'Manque de visibilité sur la programmation',
      ],
      goals: [
        'Découvrir les spectacles à proximité',
        'Planifier des sorties culturelles',
        'Réserver facilement des places',
        'Rester informé des nouveautés',
      ],
      characteristics: [
        'Habitants de Bergerac et environs (50km)',
        'Intéressés par culture et spectacle vivant',
        'Tous âges (25-70 ans)',
        'Utilisent smartphones et ordinateurs',
      ],
    },
    {
      persona: 'Touristes et Visiteurs en Dordogne',
      painPoints: [
        'Ne connaissent pas les événements locaux',
        'Cherchent des activités culturelles en voyage',
        'Besoin d\'informations pratiques (lieu, accès)',
        'Planification de voyage nécessite info claire',
      ],
      goals: [
        'Découvrir la culture locale',
        'Enrichir leur séjour touristique',
        'Trouver des sorties le soir',
        'Vivre des expériences authentiques',
      ],
      characteristics: [
        'Touristes nationaux et internationaux',
        'Séjour en Dordogne/Périgord',
        'Intéressés par patrimoine et culture',
        'Recherchent sur mobile en voyage',
      ],
    },
    {
      persona: 'Membres et Donateurs de l\'Association',
      painPoints: [
        'Veulent soutenir la culture locale',
        'Cherchent des associations à rejoindre',
        'Difficile de savoir comment contribuer',
        'Besoin de transparence sur activités',
      ],
      goals: [
        'Soutenir les arts du spectacle',
        'Participer à la vie associative',
        'Contribuer financièrement ou bénévolement',
        'Suivre l\'impact de leur soutien',
      ],
      characteristics: [
        'Engagés dans vie associative',
        'Passionnés de culture et théâtre',
        'Veulent contribuer à leur communauté',
        'Apprécient transparence et communication',
      ],
    },
  ],

  useCases: [
    {
      title: 'Découverte et Réservation de Spectacle',
      before: 'Ancien site web avec mise en page cassée, difficile de trouver les dates de spectacles, pas de système de réservation en ligne, informations manquantes ou obsolètes.',
      after: 'Site moderne et mobile-friendly, calendrier clair avec toutes les dates, réservation en ligne simple et rapide, informations complètes et à jour. Augmentation de 40% des réservations.',
      metrics: {
        timelineBefore: 'Site obsolète et peu utilisable',
        timelineAfter: 'Site moderne et performant',
        costAfter: '+40% de réservations',
      },
    },
    {
      title: 'Visibilité et Promotion Culturelle',
      before: 'Faible présence en ligne, difficile pour nouveaux publics de découvrir la compagnie, pas de galerie photo attractive, SEO inexistant.',
      after: 'Référencement Google amélioré (page 1 pour "théâtre Bergerac"), galerie photo/vidéo attractive, partage facile sur réseaux sociaux, nouveau public touché. +60% de visiteurs sur le site.',
      metrics: {
        costBefore: 'Faible visibilité en ligne',
        costAfter: '+60% de visiteurs web',
      },
    },
  ],

  keywords: {
    primary: [
      { term: 'théâtre bergerac', volume: 480 },
      { term: 'spectacle dordogne', volume: 320 },
      { term: 'compagnie duende', volume: 110 },
      { term: 'événements culturels bergerac', volume: 210 },
      { term: 'association culturelle dordogne', volume: 140 },
    ],
    secondary: [
      { term: 'sortie culturelle périgord', volume: 90 },
      { term: 'théâtre nouvelle aquitaine', volume: 170 },
      { term: 'spectacle vivant dordogne', volume: 70 },
      { term: 'agenda culturel bergerac', volume: 50 },
      { term: 'troupe théâtre bergerac', volume: 40 },
    ],
    longTail: [
      { term: 'que faire à bergerac ce weekend', volume: 260 },
      { term: 'spectacle ce soir bergerac', volume: 110 },
      { term: 'sortie culturelle bergerac famille', volume: 50 },
      { term: 'réserver spectacle théâtre dordogne', volume: 30 },
      { term: 'association théâtre bergerac adhésion', volume: 20 },
    ],
  },

  usps: {
    title: 'Culture Locale Accessible à Tous',
    description: 'Site web moderne pour une compagnie théâtrale engagée',
    differentiators: [
      'Moderne & Rapide: Next.js pour performance optimale',
      'Mobile-First: Parfait sur smartphone (80% du trafic)',
      'Accessible: WCAG compliant pour inclusion',
      'Multilingue: Français & anglais pour touristes',
      'Réservation Facile: Billets en ligne simplifiés',
      'Galerie Riche: Photos et vidéos de qualité',
      'SEO Optimisé: Visible sur Google pour "théâtre Bergerac"',
      'Open Source: Transparent et évolutif',
    ],
  },

  vsCompetition: [
    {
      category: 'VS Sites Associatifs Traditionnels',
      competitors: ['Sites WordPress vieillissants', 'Sites statiques HTML'],
      ourAdvantage: 'Technologies modernes (Next.js) = site rapide et responsive. Ancien site lent et cassé sur mobile. Nouveau site professionnel augmente crédibilité et réservations.',
    },
    {
      category: 'VS Plateformes Billetterie Externes',
      competitors: ['Fnac Spectacles', 'Billetweb', 'Eventbrite'],
      ourAdvantage: 'Intégration directe sur notre site = pas de redirection externe. Meilleure expérience utilisateur. Pas de frais de plateforme (5-10%). Association garde contrôle total.',
    },
  ],

  visualAssets: [
    {
      type: 'screenshot',
      title: 'Page d\'Accueil',
      description: 'Design moderne avec héro image et événements à venir',
      specs: {
        resolution: '1400×900',
        format: 'WebP',
      },
    },
    {
      type: 'screenshot',
      title: 'Calendrier des Spectacles',
      description: 'Interface claire pour découvrir et réserver',
      specs: {
        resolution: '1400×900',
        format: 'WebP',
      },
    },
    {
      type: 'screenshot',
      title: 'Galerie Photo',
      description: 'Photos professionnelles des représentations',
      specs: {
        resolution: '1400×900',
        format: 'WebP',
      },
    },
  ],

  callToAction: {
    primary: 'Découvrir les Spectacles',
    secondary: 'Adhérer à l\'Association',
    url: 'https://asc-tcd.fr',
  },

  socialProof: {
    stats: [
      { label: 'Spectacles par An', value: '15+' },
      { label: 'Membres Actifs', value: '50+' },
      { label: 'Années d\'Existence', value: '10+' },
      { label: 'Performance Site', value: '95+/100' },
    ],
  },

  faq: [
    {
      question: 'Comment réserver des places pour un spectacle ?',
      answer: 'Consultez notre calendrier des spectacles, cliquez sur l\'événement qui vous intéresse, puis suivez le lien de réservation. Vous pouvez réserver en ligne ou contacter directement l\'association.',
    },
    {
      question: 'Où ont lieu les représentations ?',
      answer: 'Nos spectacles se déroulent principalement à Bergerac et dans les communes environnantes de Dordogne. Le lieu exact est indiqué pour chaque événement dans le calendrier.',
    },
    {
      question: 'Comment devenir membre de l\'association ?',
      answer: 'Rendez-vous sur la page "Adhésion" pour découvrir les modalités et avantages. Adhésion annuelle ouverte à tous les passionnés de théâtre et d\'arts du spectacle.',
    },
    {
      question: 'Proposez-vous des ateliers ou formations ?',
      answer: 'Oui, la Compagnie Duende organise régulièrement des ateliers théâtre et stages. Consultez la section "Actualités" ou contactez-nous pour connaître le planning.',
    },
    {
      question: 'Le site est-il accessible sur smartphone ?',
      answer: 'Oui, le site est entièrement responsive et optimisé pour mobile. 80% de nos visiteurs naviguent depuis leur smartphone.',
    },
  ],

  brandVoice: {
    tone: [
      'Chaleureux et accueillant',
      'Culturel mais accessible',
      'Local et enraciné',
      'Passionné mais professionnel',
    ],
    avoid: [
      'Jargon théâtral élitiste',
      'Ton trop corporatif pour une asso',
      'Négliger l\'aspect communautaire',
      'Oublier le public non-initié',
    ],
  },
}

export default ascTcdSEO
