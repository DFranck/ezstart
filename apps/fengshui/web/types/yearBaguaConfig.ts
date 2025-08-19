import { BaguaTheme } from './baguaTheme'
import { Direction } from './directions'

export interface YearBaguaConfig {
  /** Année du set (ex: 2025) */
  year: number
  /** Locale du contenu (ex: "fr-FR") */
  locale: string
  /**
   * Décalage (en degrés) appliqué à la cartographie des directions -> thèmes.
   * Utile si, pour l'année, on veut "tourner" la répartition (ex: étoiles volantes).
   * 0 = mapping classique (N = Carrière, etc.)
   */
  rotationOffsetDeg: number
  /** Thèmes par direction cardinale */
  sectors: Record<Direction, BaguaTheme>
}
