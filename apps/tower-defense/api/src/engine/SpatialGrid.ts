/**
 * SpatialGrid - O(1) spatial queries for game entities
 *
 * Divides the game map into a grid of cells for fast entity lookups.
 * Used for collision detection, tower targeting, and proximity queries.
 *
 * Performance: O(1) insert, O(1) remove, O(k) query where k = entities in nearby cells
 */

import { Position } from '@tower-defense/types'

export interface Positioned {
  id: string
  position: Position
}

export class SpatialGrid<T extends Positioned> {
  private grid: Map<string, T[]> = new Map()
  private entityToCell: Map<string, string> = new Map()
  private readonly cellSize: number

  constructor(cellSize: number = 5) {
    this.cellSize = cellSize
  }

  /**
   * Insert entity into grid
   * Time: O(1)
   */
  insert(entity: T): void {
    const key = this.getCellKey(entity.position)

    // Get or create cell
    if (!this.grid.has(key)) {
      this.grid.set(key, [])
    }

    this.grid.get(key)!.push(entity)
    this.entityToCell.set(entity.id, key)
  }

  /**
   * Remove entity from grid
   * Time: O(1)
   */
  remove(entityId: string): void {
    const cellKey = this.entityToCell.get(entityId)
    if (!cellKey) return

    const cell = this.grid.get(cellKey)
    if (!cell) return

    // Remove from cell
    const index = cell.findIndex(e => e.id === entityId)
    if (index !== -1) {
      cell.splice(index, 1)
    }

    // Clean up empty cells
    if (cell.length === 0) {
      this.grid.delete(cellKey)
    }

    this.entityToCell.delete(entityId)
  }

  /**
   * Update entity position (remove + insert)
   * Time: O(1)
   */
  update(entity: T): void {
    this.remove(entity.id)
    this.insert(entity)
  }

  /**
   * Get entity by ID
   * Time: O(1)
   */
  get(entityId: string): T | undefined {
    const cellKey = this.entityToCell.get(entityId)
    if (!cellKey) return undefined

    const cell = this.grid.get(cellKey)
    if (!cell) return undefined

    return cell.find(e => e.id === entityId)
  }

  /**
   * Get all entities in nearby cells within range
   * Time: O(k) where k = entities in nearby cells (typically 5-20)
   */
  getNearby(position: Position, range: number): T[] {
    const cells = this.getNearbyCellKeys(position, range)
    const entities: T[] = []

    for (const key of cells) {
      const cell = this.grid.get(key)
      if (cell) {
        entities.push(...cell)
      }
    }

    return entities
  }

  /**
   * Get all entities
   * Time: O(n)
   */
  getAll(): T[] {
    const all: T[] = []
    for (const cell of this.grid.values()) {
      all.push(...cell)
    }
    return all
  }

  /**
   * Iterate over all entities
   * Time: O(n)
   */
  forEach(callback: (entity: T) => void): void {
    for (const cell of this.grid.values()) {
      for (const entity of cell) {
        callback(entity)
      }
    }
  }

  /**
   * Clear all entities
   * Time: O(1)
   */
  clear(): void {
    this.grid.clear()
    this.entityToCell.clear()
  }

  /**
   * Get number of entities
   * Time: O(1)
   */
  get size(): number {
    return this.entityToCell.size
  }

  /**
   * Get grid statistics
   */
  getStats() {
    return {
      totalEntities: this.entityToCell.size,
      totalCells: this.grid.size,
      avgEntitiesPerCell: this.entityToCell.size / (this.grid.size || 1),
      cellSize: this.cellSize,
    }
  }

  // Private helpers

  private getCellKey(position: Position): string {
    const x = Math.floor(position.x / this.cellSize)
    const y = Math.floor(position.y / this.cellSize)
    return `${x},${y}`
  }

  private getNearbyCellKeys(position: Position, range: number): string[] {
    const cells: string[] = []
    const cellRange = Math.ceil(range / this.cellSize)

    const centerX = Math.floor(position.x / this.cellSize)
    const centerY = Math.floor(position.y / this.cellSize)

    for (let x = centerX - cellRange; x <= centerX + cellRange; x++) {
      for (let y = centerY - cellRange; y <= centerY + cellRange; y++) {
        cells.push(`${x},${y}`)
      }
    }

    return cells
  }
}

/**
 * Utility: Calculate distance between two positions
 */
export function distance(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}
