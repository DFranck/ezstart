// app/[locale]/lobby/components/LobbyPlayersList.tsx
'use client';

import { Player } from '@ezstart/types';

type Props = {
  players: Player[];
};

export function LobbyPlayersList({ players }: Props) {
  return (
    <ul className="mt-4 space-y-2">
      {players.map((p) => (
        <li key={p.id} className="p-2 border rounded bg-white/10">
          {p.name}
        </li>
      ))}
    </ul>
  );
}
