'use client';
import { Div, H6, P } from '@ezstart/ui/components';
import { Game, mockTowers } from '@tower-defense/types';
import { useRef, useState } from 'react';

type TowerPlacerProps = {
  game: Game;
};

export function TowerPlacer({ game }: TowerPlacerProps) {
  const [towers, setTowers] = useState(mockTowers);
  const [previewShape, setPreviewShape] = useState<boolean[][] | null>(null);

  const dragPreviewRef = useRef<HTMLDivElement>(null);

  return (
    <Div size={'xs'} layout={'grid'}>
      {/* Drag Preview (hidden) */}
      <div
        ref={dragPreviewRef}
        className='pointer-events-none fixed opacity-0 z-50'
      >
        {previewShape && (
          <div
            className='grid gap-[2px]'
            style={{
              gridTemplateColumns: `repeat(${Math.max(...previewShape.map((r) => r.length))}, 1rem)`,
            }}
          >
            {previewShape.flatMap((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`w-4 h-4 rounded-sm ${
                    cell ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
              ))
            )}
          </div>
        )}
      </div>

      {towers.map((tower) => (
        <Div size={'xs'} variant={'card'} layout={'col'} key={tower._id}>
          <H6 className='line-clamp-1'>{tower.name}</H6>
          <P>{tower.type}</P>

          {/* Shape = drag handle */}
          <Div
            draggable
            onDragStart={(e) => {
              setPreviewShape(tower.shape);
              setTimeout(() => {
                if (dragPreviewRef.current) {
                  e.dataTransfer.setDragImage(dragPreviewRef.current, 10, 10);
                }
              }, 0); // 👈 force le DOM à refléter le changement
            }}
            onDragEnd={() => {
              setPreviewShape(null);
            }}
            className='inline-grid gap-[2px] cursor-grab active:cursor-grabbing'
            style={{
              gridTemplateColumns: `repeat(${Math.max(
                ...tower.shape.map((row) => row.length)
              )}, 1rem)`,
            }}
          >
            {tower.shape.flatMap((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`w-4 h-4 rounded-sm ${
                    cell ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
              ))
            )}
          </Div>
        </Div>
      ))}
    </Div>
  );
}
