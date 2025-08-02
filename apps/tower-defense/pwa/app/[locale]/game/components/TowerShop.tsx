// /app/[locale]/game/components/TowerShop.tsx
'use client';

import { TOWER_LIST } from '@tower-defense/config';
import { useGameState } from '@/stores/useGameState';

export function TowerShop() {
  const { setDraggedTower } = useGameState();

  return (
    <div className="flex gap-2">
      {TOWER_LIST.map(tower => (
        <button
          key={tower.id}
          onClick={() => setDraggedTower(tower)}
          className="bg-blue-500 text-white p-2 rounded"
        >
          {tower.name}
        </button>
      ))}
    </div>
  );
}
