import { Position } from './position'
import { Tower } from './tower'

export type PlacedTower = Tower & {
  origin: Position
  coveredCells: Position[]
}
