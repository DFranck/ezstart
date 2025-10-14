import { Mob, Position, Tower, TowerType } from '@tower-defense/types'
import { computeCoveredCells, findPath } from '@tower-defense/utils'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Frontend PlacedTower with full tower data for rendering (flattened TowerType)
// Compatible with utils functions that expect { coveredCells: Position[] }
export type PlacedTowerFrontend = TowerType & {
  origin: Position
  coveredCells: Position[]
  // Optional fields from backend PlacedTower for compatibility
  id?: string
  towerTypeId?: string
  playerId?: string
}

interface GameState {
  //towers
  towers: PlacedTowerFrontend[]
  draggedTower: Tower | null
  draggedTowerPrice: number | null
  setDraggedTower: (tower: Tower | null, price?: number) => void
  placeTowerAt: (x: number, y: number, tower: Tower) => void
  addTower: (tower: PlacedTowerFrontend) => void

  toSendMobs: Mob[]
  addMobToSend: (mob: Mob) => void
  resetMobQueue: () => void

  path: Position[]
  setPath: (path: Position[]) => void
  initPath: () => void

  // Gold management
  gold: number
  addGold: (amount: number) => void
  spendGold: (amount: number) => boolean
  setGold: (amount: number) => void

  resetGame: () => void
}

export const useGameState = create<GameState>()(
  persist(
    set => ({
      towers: [],
      draggedTower: null,
      draggedTowerPrice: null,
      path: [],
      toSendMobs: [],
      gold: 15, // Starting gold

      addMobToSend: mob => set(s => ({ toSendMobs: [...s.toSendMobs, mob] })),
      resetMobQueue: () => set({ toSendMobs: [] }),

      addGold: amount => set(s => ({ gold: s.gold + amount })),
      spendGold: amount =>
        set(s => {
          if (s.gold >= amount) {
            return { gold: s.gold - amount }
          }
          return s // Not enough gold
        }) as unknown as boolean,
      setGold: amount => set({ gold: amount }),

      resetGame: () =>
        set(() => ({
          towers: [],
          path: [],
          draggedTower: null,
          draggedTowerPrice: null,
          toSendMobs: [],
          gold: 15, // Reset to starting gold
        })),
      setDraggedTower: (tower, price) =>
        set({ draggedTower: tower, draggedTowerPrice: price ?? null }),

      addTower: tower => set(s => ({ towers: [...s.towers, tower] })),
      setPath: path => set({ path }),
      initPath: () =>
        set(s => {
          const blocked = s.towers.flatMap(t => t.coveredCells)
          const path = findPath(blocked)
          // Path recalculated
          return { path }
        }),
      placeTowerAt: (x, y, tower) => {
        const coveredCells = computeCoveredCells(x, y, tower)
        const placed: PlacedTowerFrontend = {
          ...tower,
          origin: { x, y },
          coveredCells,
        }

        set(s => {
          // Deduct gold if tower has a price
          const price = s.draggedTowerPrice ?? 0
          const newGold = price > 0 ? s.gold - price : s.gold

          const nextTowers = [...s.towers, placed]
          const blocked = nextTowers.flatMap(t => t.coveredCells)
          const newPath = findPath(blocked)

          return {
            towers: nextTowers,
            draggedTower: null,
            draggedTowerPrice: null,
            path: newPath,
            gold: newGold,
          }
        })
      },
    }),
    {
      name: 'game-state', // Clé dans localStorage
      onRehydrateStorage: () => state => {},
      partialize: state => ({
        toSendMobs: state.toSendMobs,
        gold: state.gold,
      }),
    }
  )
)
