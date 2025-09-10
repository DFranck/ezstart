import { Mob, PlacedTower, Position, Tower } from '@tower-defense/types'
import { computeCoveredCells, findPath } from '@tower-defense/utils'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GameState {
  //towers
  towers: PlacedTower[]
  draggedTower: Tower | null
  setDraggedTower: (tower: Tower | null) => void
  placeTowerAt: (x: number, y: number, tower: Tower) => void
  addTower: (tower: PlacedTower) => void

  toSendMobs: Mob[]
  addMobToSend: (mob: Mob) => void
  resetMobQueue: () => void

  path: Position[]
  setPath: (path: Position[]) => void
  initPath: () => void

  resetGame: () => void
}

export const useGameState = create<GameState>()(
  persist(
    set => ({
      towers: [],
      draggedTower: null,
      path: [],
      toSendMobs: [],
      addMobToSend: mob => set(s => ({ toSendMobs: [...s.toSendMobs, mob] })),
      resetMobQueue: () => set({ toSendMobs: [] }),
      resetGame: () =>
        set(() => ({
          towers: [],
          path: [],
          draggedTower: null,
          toSendMobs: [],
        })),
      setDraggedTower: tower => set({ draggedTower: tower }),

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
        const placed: PlacedTower = {
          ...tower,
          origin: { x, y },
          coveredCells,
        }

        set(s => {
          const nextTowers = [...s.towers, placed]
          const blocked = nextTowers.flatMap(t => t.coveredCells)
          const newPath = findPath(blocked)

          return {
            towers: nextTowers,
            draggedTower: null,
            path: newPath,
          }
        })
      },
    }),
    {
      name: 'game-state', // Clé dans localStorage
      onRehydrateStorage: () => state => {},
      partialize: state => ({
        toSendMobs: state.toSendMobs,
      }),
    }
  )
)
