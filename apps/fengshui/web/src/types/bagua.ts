/* path: /types/bagua.ts */
// ─────────────────────────────────────────────────────────────────────────────
// Types & constantes partagés
// ─────────────────────────────────────────────────────────────────────────────

export type Transformations = {
  rotation: number
  scale: number
  position: { x: number; y: number }
  crop?: { x: number; y: number; width: number; height: number }
  zoom?: number
}

export type AiValidationResult = {
  isValid: boolean
  score: number
  roomsDetected: number
  feedback: string
}

export type UploadStepData = {
  file?: File
  preview?: string
  transformations?: Transformations
  aiValidation?: AiValidationResult
}

export type CardinalStepData = {
  /** angle mesuré depuis l’Est (repère écran) — utilisé seulement pour debug */
  rotationAngle?: number
  /** 0° = Nord (sens horaire). Valeur à consommer côté rendu. */
  bearingFromNorth?: number
}

export type BaguaSector = {
  id: 'SE' | 'S' | 'SO' | 'E' | 'CENTER' | 'O' | 'NE' | 'N' | 'NO'
  name: string
  color: string
  direction: string
  element: string
}

export const BAGUA_SECTORS: BaguaSector[] = [
  { id: 'SE', name: 'Sud-Est', color: '#88ff00', direction: 'Sud-Est', element: 'Bois' },
  { id: 'S', name: 'Sud', color: '#00ff88', direction: 'Sud', element: 'Feu' },
  { id: 'SO', name: 'Sud-Ouest', color: '#0088ff', direction: 'Sud-Ouest', element: 'Terre' },
  { id: 'E', name: 'Est', color: '#ffd700', direction: 'Est', element: 'Bois' },
  { id: 'CENTER', name: 'Centre', color: '#cccccc', direction: 'Centre', element: 'Terre' },
  { id: 'O', name: 'Ouest', color: '#8800ff', direction: 'Ouest', element: 'Métal' },
  { id: 'NE', name: 'Nord-Est', color: '#ff8800', direction: 'Nord-Est', element: 'Terre' },
  { id: 'N', name: 'Nord', color: '#ff4444', direction: 'Nord', element: 'Eau' },
  { id: 'NO', name: 'Nord-Ouest', color: '#ff0088', direction: 'Nord-Ouest', element: 'Métal' },
]

export type VisualizationMode = 'grid' | 'wheel'
export type GridStyle = 'square' | 'diamond'
