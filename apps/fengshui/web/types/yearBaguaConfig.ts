import { YearBaguaSector } from './baguaTheme'
import { Cardinal } from './directions'

export interface YearBaguaConfig {
  year: number
  locale: string
  /** Décalage global (degrés) appliqué à la roue */
  rotationOffsetDeg?: number
  /** Réglages d’affichage facultatifs */
  ui?: {
    labelRadiusPct?: number // rayon des libellés/points cardinaux
    cardsRadiusPct?: number // rayon d’ancrage des cards autour de la roue
    grid?: {
      showTriangulation?: boolean
      showLoShu?: boolean
      stroke?: string
      dasharray?: string
      width?: number
    }
  }
  sectors: Record<Cardinal, YearBaguaSector>
}
