// path: @tower-defense/app/components/Tower.tsx
'use client'

import { TILE_SIZE } from '@tower-defense/config'
import type { Tower as TowerType } from '@tower-defense/types'
import { contrastText, paintFromElement } from '@tower-defense/utils'

type TowerProps = {
  tower: TowerType
  className?: string
}

export function Tower({ tower, className }: TowerProps) {
  const paint = paintFromElement(tower.elementalType as any)

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(...tower.shape.map(r => r.length))}, ${TILE_SIZE}px)`,
        gap: 2,
      }}
      aria-label={`${Array.isArray(tower.elementalType) ? tower.elementalType.join('/') : tower.elementalType} tower`}
      data-owner="ezstart"
      data-channel="tower"
      data-action="render"
    >
      {tower.shape.flatMap((row, y) =>
        row.map((cell, x) => {
          const isFilled = !!cell
          const bg = isFilled ? paint.background : 'transparent'
          const border = isFilled ? '1px solid rgba(0,0,0,0.15)' : '1px dashed rgba(0,0,0,0.1)'
          return (
            <div
              key={`${x}-${y}`}
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                background: bg,
                border,
                borderRadius: 4,
              }}
              aria-hidden={!isFilled}
            />
          )
        })
      )}
      {/* label optionnel */}
      <div
        style={{
          gridColumn: `1 / -1`,
          marginTop: 6,
          fontSize: 12,
          lineHeight: 1,
          color: contrastText(
            Array.isArray(tower.elementalType)
              ? paint.color // heuristique: contraster sur la première couleur
              : paint.color
          ),
          textAlign: 'center',
        }}
      >
        {tower.name}
      </div>
    </div>
  )
}
