// app/[locale]/game/[gameId]/page.tsx

import { Game } from '@ezstart/types';
import { callApi } from '@ezstart/ui/utils';
import { notFound } from 'next/navigation';

import { GameCanvas } from '../components/GameCanvas';
import { Hud } from '../components/Hud';
import { MobSpawner } from '../components/MobSpawner';
import { PlayerStatsPanel } from '../components/PlayerStatsPanel';
import { TowerPlacer } from '../components/TowerPlacer';

export default async function GamePage({
  params,
}: {
  params: { gameId: string };
}) {
  const { gameId } = params;

  // Fetch game data from API
  const res = await callApi(`/api/games/${gameId}`);
  if (!res.ok) return notFound();

  const game: Game = res.data;

  return (
    // Fullscreen layout — vertical on mobile, horizontal on desktop
    <div className='flex flex-col h-screen w-full'>
      {/* Full-width top HUD bar (fixed/relative) */}
      <Hud game={game} />

      {/* Game zone (canvas + interaction sidebar) — responsive layout */}
      <div className='flex flex-1 flex-col-reverse md:flex-row'>
        {/* GameCanvas takes full height and expands */}
        <div className='flex-1 relative overflow-hidden'>
          <GameCanvas game={game} />
        </div>

        {/* Interaction sidebar — below on mobile, right on desktop */}
        <div className='w-full md:w-[300px] flex flex-col gap-4 p-4 bg-zinc-900'>
          <TowerPlacer game={game} />
          <MobSpawner game={game} />
          <PlayerStatsPanel game={game} />
        </div>
      </div>
    </div>
  );
}
