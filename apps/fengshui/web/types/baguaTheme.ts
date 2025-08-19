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
