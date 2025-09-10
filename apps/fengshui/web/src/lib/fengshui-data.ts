export interface FengShuiSector {
  id: string
  name: string
  direction: string
  element: 'fire' | 'earth' | 'metal' | 'water' | 'wood'
  elementColor: string
  concepts: string[]
  positiveIndicator?: string
  negativeIndicator?: string
  remedies: string[]
  angle: number // Angle en degrés depuis le nord
}

export const FENGSHUI_SECTORS: FengShuiSector[] = [
  {
    id: 'south',
    name: 'Sud',
    direction: 'Sud',
    element: 'fire',
    elementColor: '#FF4444',
    concepts: ['Notoriété', 'Intelligence', 'Dynamisme', 'Passion', 'Reconnaissance', 'Éclat'],
    positiveIndicator: '6 céleste (richesse, pouvoir, succès)',
    remedies: ['Carillon en métal', 'Grenouille', 'Quartz'],
    angle: 180,
  },
  {
    id: 'southwest',
    name: 'Sud-Ouest',
    direction: 'Sud-Ouest',
    element: 'earth',
    elementColor: '#FFD700',
    concepts: ['Relations', 'Amour', 'Amitié', 'Labeur', 'Générosité'],
    positiveIndicator: 'Prospérité future Terre',
    remedies: ['Éléments métal'],
    angle: 225,
  },
  {
    id: 'west',
    name: 'Ouest',
    direction: 'Ouest',
    element: 'metal',
    elementColor: '#C0C0C0',
    concepts: ['Concentration', 'Précision', 'Sang froid', 'Logique', 'Analyse'],
    positiveIndicator: 'Education & harmonie',
    remedies: ['Eau en mouvement'],
    angle: 270,
  },
  {
    id: 'northwest',
    name: 'Nord-Ouest',
    direction: 'Nord-Ouest',
    element: 'metal',
    elementColor: '#C0C0C0',
    concepts: ['Créativité', 'Réseaux', 'Aide extérieures'],
    negativeIndicator: 'Querelle',
    remedies: ['Feu/métal/terre (pierre précieuse)'],
    angle: 315,
  },
  {
    id: 'north',
    name: 'Nord',
    direction: 'Nord',
    element: 'water',
    elementColor: '#0066CC',
    concepts: [
      'Carrière',
      'Démarrage de projet',
      'Introspection',
      'Émotions et spiritualité',
      'Déplacement',
    ],
    negativeIndicator: 'Violence',
    remedies: ['Bois/eau'],
    angle: 0,
  },
  {
    id: 'northeast',
    name: 'Nord-Est',
    direction: 'Nord-Est',
    element: 'earth',
    elementColor: '#FFD700',
    concepts: ['Solitude', 'Sagesse', 'Développement intérieur', 'Études'],
    negativeIndicator: 'Malchance',
    remedies: ['Cure de sel + pièce métal'],
    angle: 45,
  },
  {
    id: 'east',
    name: 'Est',
    direction: 'Est',
    element: 'wood',
    elementColor: '#228B22',
    concepts: [
      'Expansion',
      'Croissance',
      'Imagination',
      'Créativité',
      'Développement',
      'Compétitivité',
    ],
    positiveIndicator: 'Multiplicative',
    remedies: ['Bougies'],
    angle: 90,
  },
  {
    id: 'southeast',
    name: 'Sud-Est',
    direction: 'Sud-Est',
    element: 'wood',
    elementColor: '#228B22',
    concepts: ['Prospérité', 'Abondance', 'Réussite, la renommée, la prospérité'],
    remedies: ['Paire de poissons'],
    angle: 135,
  },
]

export const CENTER_SECTOR: FengShuiSector = {
  id: 'center',
  name: 'Centre',
  direction: 'Centre',
  element: 'earth',
  elementColor: '#FFD700',
  concepts: ['Maladie', 'Bouddha/pièce nœuds'],
  remedies: ['Éléments équilibrés'],
  angle: 0,
}

export function getSectorByAngle(angle: number): FengShuiSector {
  // Normaliser l'angle entre 0 et 360
  const normalizedAngle = ((angle % 360) + 360) % 360

  // Trouver le secteur le plus proche
  let closestSector = FENGSHUI_SECTORS[0]
  let minDifference = Math.abs(normalizedAngle - closestSector.angle)

  for (const sector of FENGSHUI_SECTORS) {
    const difference = Math.abs(normalizedAngle - sector.angle)
    if (difference < minDifference) {
      minDifference = difference
      closestSector = sector
    }
  }

  return closestSector
}

export function getSectorById(id: string): FengShuiSector | undefined {
  return FENGSHUI_SECTORS.find(sector => sector.id === id)
}
