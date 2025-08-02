import { computeCoveredCells } from '@/utils/shapeUtils'
import { PlacedTower, Position, Tower } from '@tower-defense/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GameState {
  towers: PlacedTower[]
  draggedTower: Tower | null
  path: Position[]

  setDraggedTower: (tower: Tower | null) => void
  addTower: (tower: PlacedTower) => void
  setPath: (path: Position[]) => void
  placeTowerAt: (x: number, y: number, tower: Tower) => void
  resetGame: () => void
}

export const useGameState = create<GameState>()(
  persist(
    set => ({
      towers: [],
      draggedTower: null,
      path: [],
      resetGame: () =>
        set(() => ({
          towers: [],
          path: [],
          draggedTower: null,
        })),
      setDraggedTower: tower => set({ draggedTower: tower }),
      addTower: tower => set(s => ({ towers: [...s.towers, tower] })),
      setPath: path => set({ path }),

      placeTowerAt: (x, y, tower) => {
        const coveredCells = computeCoveredCells(x, y, tower)
        const placed: PlacedTower = {
          ...tower,
          origin: { x, y },
          coveredCells,
        }
        set(s => ({
          towers: [...s.towers, placed],
          draggedTower: null,
        }))
      },
    }),
    {
      name: 'game-state', // Clé dans localStorage
      partialize: state => ({
        towers: state.towers,
        path: state.path,
      }),
    }
  )
)
