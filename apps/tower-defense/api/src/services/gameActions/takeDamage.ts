import { logger } from '@ezstart/ui/lib'
import { InGamePlayerModel } from '../../models/InGamePlayer.js'

interface TakeDamagePayload {
  playerId: string
  damage: number
}

export async function takeDamage(gameId: string, payload: TakeDamagePayload) {
  const { playerId, damage } = payload

  try {
    // Trouver le joueur dans la game
    const inGamePlayer = await InGamePlayerModel.findOne({
      gameId,
      player: playerId,
      status: 'active'
    })

    if (!inGamePlayer) {
      throw new Error('Player not found or not active')
    }

    // Infliger les dégâts
    inGamePlayer.hp = Math.max(0, inGamePlayer.hp - damage)
    await inGamePlayer.save()

    logger.debug(`Player ${playerId} took ${damage} damage, HP now: ${inGamePlayer.hp}`)

    return {
      success: true,
      playerId,
      damage,
      newHp: inGamePlayer.hp,
      eliminated: inGamePlayer.hp <= 0
    }
  } catch (error) {
    logger.error('Error in takeDamage action:', error)
    throw error
  }
}