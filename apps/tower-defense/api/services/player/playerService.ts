import { logger } from '@ezstart/ui/lib'
import { CreateOrFindPlayerPayload, Player } from '@tower-defense/types'
import { PlayerModel } from '../../models/Player'

export async function findOrCreatePlayer({ name, userId }: CreateOrFindPlayerPayload) {
  logger.debug('findOrCreatePlayer', { name, userId })
  const existing = await PlayerModel.findOne({
    $or: [{ name }, ...(userId ? [{ userId }] : [])],
  })

  if (existing) {
    logger.debug('Player found', existing)
    return {
      player: existing.toObject() as Player,
      isNew: false,
    }
  }

  const created = await PlayerModel.create({ name, userId })
  logger.debug('Player created', created)
  return {
    player: created.toObject() as Player,
    isNew: true,
  }
}
