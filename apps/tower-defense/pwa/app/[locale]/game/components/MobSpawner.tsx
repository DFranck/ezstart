// game/components/MobSpawner.tsx
'use client'
import { Button, Div, H6, P, Tooltip, TooltipContent, TooltipTrigger } from '@ezstart/ui/components'
import { logger } from '@ezstart/ui/lib'
import { Game, mockMobs } from '@tower-defense/types'

type MobSpawnerProps = {
  game: Game
}

export function MobSpawner({ game }: MobSpawnerProps) {
  const mobs = mockMobs
  logger.debug('mobs', mobs)
  return (
    <Div size={'xs'} layout={'grid'}>
      {mobs.map((mob, index) => (
        <Div size={'xs'} variant={'card'} layout={'col'} key={mob._id + index}>
          <H6 className="line-clamp-1">{mob.name}</H6>

          <P>hp:{mob.hp}</P>
          <P>speed:{mob.speed}</P>
          <P>
            effects:
            {mob.effects?.map((e, index) => (
              <Tooltip key={e + index}>
                <TooltipTrigger asChild>
                  <Button name={e}>{e}</Button>
                </TooltipTrigger>
                <TooltipContent>{`This is ${e}`}</TooltipContent>
              </Tooltip>
            ))}
          </P>
        </Div>
      ))}
    </Div>
  )
}
