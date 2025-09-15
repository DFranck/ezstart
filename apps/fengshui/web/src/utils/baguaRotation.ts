import { YearBaguaConfig } from '@/types/yearBaguaConfig'

/**
 * Calcule la rotation pour aligner les secteurs Bagua selon le bearing
 * Logique commune entre BaguaWheel et BaguaGrid
 */
export function calculateBaguaRotation(
  bearingFromNorth: number,
  config?: YearBaguaConfig
): number {
  // LOGIQUE SIMPLIFIEE:
  // Si bearing = 315° (Nord à -45° sur écran), on veut que les secteurs tournent de 315°
  // Pas de conversion compliquée, bearing = rotation directe
  const configOffset = config?.rotationOffsetDeg ?? 0
  const rotation = bearingFromNorth + configOffset
  const normalizedRotation = ((rotation % 360) + 360) % 360


  return normalizedRotation
}