// path: @tower-defense/app/components/Tower.tsx
'use client'

import { TILE_SIZE } from '@tower-defense/config'
import type { Tower as TowerType } from '@tower-defense/types'
import { contrastText, paintFromElement } from '@tower-defense/utils'

type TowerProps = {
  tower: TowerType
  onClick?: () => void
  ref?: React.Ref<HTMLDivElement>
  className?: string
  showStats?: boolean
}

export function Tower({ tower, onClick, ref, className, showStats = false }: TowerProps) {
  const paint = paintFromElement(tower.elementalType as any)

  return (
    <div className="relative w-fit">
      <div
        onClick={onClick}
        ref={ref ? ref : undefined}
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
        ></div>
      </div>

      {/* Stat badges - only shown in shop */}
      {showStats && (
        <>
          {/* Damage badge (top-left) - only number */}
          <div className="absolute -top-1 -left-1 px-1 py-0.5 rounded-sm text-[10px] font-bold bg-orange-500/90 text-white leading-none">
            {tower.damage}
          </div>

          {/* Range badge (top-right) - only number */}
          {/* <div className="absolute -top-1 -right-1 px-1 py-0.5 rounded-sm text-[10px] font-bold bg-blue-500/90 text-white leading-none">
            {tower.range}
          </div> */}

          {/* Speed badge (bottom-left) - only number */}
          {/* <div className="absolute -bottom-1 -left-1 px-1 py-0.5 rounded-sm text-[10px] font-bold bg-green-500/90 text-white leading-none">
            {tower.speed}
          </div> */}

          {/* Special badges - smaller, only if present */}
          {/* {tower.splashRadius && tower.splashRadius > 0 && (
            <div className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded-sm text-[10px] font-bold bg-purple-500/90 text-white leading-none">
              {tower.splashRadius}
            </div>
          )} */}

          {/* {tower.effect && (
            <div className="absolute top-0 right-0">
              <Icon name="lucide:Sparkles" className="w-2.5 h-2.5 text-yellow-400" />
            </div>
          )} */}
        </>
      )}
    </div>
  )
}
