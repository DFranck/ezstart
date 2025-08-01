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

  const res = await callApi(`/api/games/${gameId}`);
  if (!res.ok) return notFound();

  const game: Game = res.data;

  return (
    <div className='flex flex-col h-screen w-full bg-black text-white'>
      <Hud game={game} />

      <div className='flex flex-1'>
        <GameCanvas game={game} />
        <div className='flex flex-col justify-between p-4 w-[300px]'>
          <TowerPlacer game={game} />
          <MobSpawner game={game} />
          <PlayerStatsPanel game={game} />
        </div>
      </div>
    </div>
  );
}
