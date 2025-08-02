import { findPath } from '@/utils/pathfinding'
import { computeCoveredCells } from '@/utils/shapeUtils'
import { logger } from '@ezstart/ui/lib'
import { ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config'
import { Mob, PlacedTower, Position, Tower } from '@tower-defense/types'
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
        })),
      setDraggedTower: tower => set({ draggedTower: tower }),

      addTower: tower => set(s => ({ towers: [...s.towers, tower] })),
      setPath: path => set({ path }),
      initPath: () =>
        set(s => {
          const blocked = s.towers.flatMap(t => t.coveredCells)
          const path = findPath(
            { x: 0, y: 0 }, // start
            { x: ZONE_WIDTH - 1, y: ZONE_HEIGHT - 1 }, // end
            blocked
          )
          logger.debug('[initPath] blocked cells:', blocked)
          logger.debug('[initPath] found path:', path)

          return { path }
        }),
      placeTowerAt: (x, y, tower) => {
        const coveredCells = computeCoveredCells(x, y, tower)
        console.log('[STORE] Placing tower at', x, y, coveredCells)
        const placed: PlacedTower = {
          ...tower,
          origin: { x, y },
          coveredCells,
        }

        set(s => {
          const nextTowers = [...s.towers, placed]
          const blocked = nextTowers.flatMap(t => t.coveredCells)
          const newPath = findPath(
            { x: 0, y: 0 },
            { x: ZONE_WIDTH - 1, y: ZONE_HEIGHT - 1 },
            blocked
          )

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
      onRehydrateStorage: () => state => {
        console.log('draggedTower', state?.draggedTower)
        console.log('towers', state?.towers)
        console.log('path', state?.path)
        console.log('toSendMobs', state?.toSendMobs)
      },
      partialize: state => ({
        towers: state.towers,
        path: state.path,
        toSendMobs: state.toSendMobs,
      }),
    }
  )
)
