// /stores/useGameState.ts
import { create } from 'zustand'

type Tile = { x: number; y: number }
type Tower = Tile & { id: string }

type TowerType = {
  id: string
  name: string
}

interface GameState {
  towers: Tower[]
  draggedTower: TowerType | null
  path: Tile[]
  setDraggedTower: (tower: TowerType | null) => void
  addTower: (t: Tower) => void
  setPath: (path: Tile[]) => void
}

export const useGameState = create<GameState>(set => ({
  towers: [],
  draggedTower: null,
  path: [],
  setDraggedTower: tower => set({ draggedTower: tower }),
  addTower: tower => set(s => ({ towers: [...s.towers, tower] })),
  setPath: path => set({ path }),
}))
