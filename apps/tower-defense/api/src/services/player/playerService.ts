import { logger } from '@ezstart/logger/server'
import { CreateOrFindPlayerPayload, Player } from '@tower-defense/types'
import { PlayerModel } from '../../models/Player.js'

function transformPlayerId(player: any): Player {
  const { _id, ...rest } = player
  return {
    _id: _id.toString(),
    ...rest,
  }
}

export async function findOrCreatePlayer({ name, userId }: CreateOrFindPlayerPayload) {
  logger.debug('findOrCreatePlayer', { name, userId })
  const existing = await PlayerModel.findOne({
    $or: [{ name }, ...(userId ? [{ userId }] : [])],
  })

  if (existing) {
    logger.debug('Player found', existing)
    return {
      player: transformPlayerId(existing.toObject()),
      isNew: false,
    }
  }

  const created = await PlayerModel.create({ name, userId })
  logger.debug('Player created', created)
  return {
    player: transformPlayerId(created.toObject()),
    isNew: true,
  }
}
