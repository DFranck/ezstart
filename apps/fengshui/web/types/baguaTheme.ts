import { KnownIconName } from '@ezstart/ui/components'

export interface BaguaTheme {
  /** Titre affiché (ex: "Carrière") */
  title: string
  /** Élément (ex: "Eau", "Bois", "Feu", "Terre", "Métal") */
  element: string
  /** Brève description / mots-clés */
  summary?: string
  /** Recos (puces courtes) */
  tips?: string[]
  /** Icône éventuelle (nom Lucide/Emoji/etc.) */
  icon?: string
}
export interface YearBaguaSector {
  /** Titre affiché (localisé) */
  title: string
  /** Élément Wuxing principal */
  element: 'Eau' | 'Bois' | 'Feu' | 'Terre' | 'Métal'
  /** Résumé court (localisé) */
  summary?: string

  /** Couleur dominante pour UI (hex) */
  colorHex?: string
  /** Forme symbolique (pour pictos/shapes) */
  shape?: 'circle' | 'square' | 'triangle' | 'rectangle' | 'wave'
  /** Icône (ton système d’icônes) */
  icon?: KnownIconName

  /** Mots-clés (tags) */
  keywords?: string[]

  /** Conseils / activateurs */
  tips?: string[]
  enhancers?: string[] // alias plus explicite
  /** Remèdes / équilibrages (quand trop fort / affligé) */
  remedies?: string[]
  /** À éviter */
  avoid?: string[]
  /** Symboles usuels (ex: “fontaine”, “bougies”, “sphères métal”) */
  symbols?: string[]

  /** Notes libres (affichables en tooltip) */
  notes?: string
}
