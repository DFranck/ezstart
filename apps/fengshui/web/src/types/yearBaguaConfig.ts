import { Direction } from './directions'

// Configuration de base (ne change jamais)
export interface BaguaBaseConfig {
  locale: string
  sectors: Record<Direction, BaguaBaseSector>
}

export interface BaguaBaseSector {
  title: string
  element: string
  number: number
  summary: string
  colorHexes: string[]
  shape: 'circle' | 'square' | 'triangle' | 'rectangle' | 'wave'
  icon?: string
  matiere: string
  nourisher: string
  controller: string
  weakenedBy: string
  enhancers: string[]
}

// Étoiles volantes (changent chaque année)
export interface BaguaStarsConfig {
  year: number
  locale: string
  stars: Record<Direction, BaguaStar>
}

export interface BaguaStar {
  star: string
  element: string
  status: 'bonne' | 'mauvaise'
  remedies: string[]
}

// Configuration combinée pour l'utilisation dans l'app
export interface YearBaguaConfig {
  year: number
  locale: string
  /** Décalage global (degrés) appliqué à la roue */
  rotationOffsetDeg?: number
  /** Réglages d'affichage facultatifs */
  ui?: {
    labelRadiusPct?: number
    cardsRadiusPct?: number
    grid?: {
      showTriangulation?: boolean
      showLoShu?: boolean
      stroke?: string
      dasharray?: string
      width?: number
    }
  }
  orientations: Record<Direction, CombinedOrientation>
}

// Orientation combinant base + étoile + compatibilité ancienne structure
export interface CombinedOrientation extends BaguaBaseSector {
  star?: BaguaStar
  
  // Propriétés héritées de l'ancienne structure pour compatibilité
  colorHex?: string
  keywords?: string[]
  tips?: string[]
  remedies?: string[]
  avoid?: string[]
  symbols?: string[]
  notes?: string
}
