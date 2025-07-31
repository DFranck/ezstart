import { Game, Player } from '@ezstart/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
export type GameStore = {
  game: Game | null;
  player: Player | null;
  lobby: {
    gameId: string;
    playerId: string;
    playerName: string;
    timestamp: string;
  } | null;

  setGame: (game: Game) => void;
  setPlayer: (player: Player) => void;
  resetGame: () => void;
};
export const useGameStore = create<GameStore>()(
  devtools((set) => ({
    game: null,
    player: null,
    setGame: (game) => set({ game }),
    setPlayer: (player) => set({ player }),
    resetGame: () => set({ game: null, player: null }),
  }))
);
