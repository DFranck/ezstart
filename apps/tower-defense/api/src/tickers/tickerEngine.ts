import { createTickerEngine } from '@ezstart/express-core'
import type { ActiveMob, InGamePlayer } from '@tower-defense/types'
import { findPath } from '@tower-defense/utils'
import { checkPlayerEliminationService } from '../services/checkPlayerEliminationService.js'

// Fonction pour déplacer les mobs sur leur path
function moveMobs(activeMobs: ActiveMob[], players: InGamePlayer[]): ActiveMob[] {
  if (!activeMobs || !Array.isArray(activeMobs)) {
    return []
  }

  return activeMobs
    .map(mob => {
      // Trouver le joueur cible
      const targetPlayer = players.find(p => p.player?._id?.toString() === mob.targetPlayerId)
      if (!targetPlayer) {
        console.log(`[moveMobs] No target player found for mob ${mob.id}`)
        return null
      }

      // Calculer le path du joueur cible
      const blockedCells = targetPlayer.placedTowers.flatMap(t => t.coveredCells)
      const path = findPath(blockedCells)

      console.log(
        `[moveMobs] Mob ${mob.id}: pathIndex=${mob.pathIndex}, pathLength=${path.length}, position=(${mob.position.x}, ${mob.position.y})`
      )

      if (path.length === 0 || mob.pathIndex >= path.length) {
        // Mob a atteint la fin - il faut gérer les dégâts au joueur ici
        console.log(`[moveMobs] Mob ${mob.id} reached end of path`)
        return null
      }

      // Position cible (prochaine case du path)
      const targetCell = path[mob.pathIndex]
      if (!targetCell) {
        console.warn(`[moveMobs] Invalid pathIndex ${mob.pathIndex} for path length ${path.length}`)
        return null
      }

      // Calculer le mouvement vers la position cible
      const dx = targetCell.x - mob.position.x
      const dy = targetCell.y - mob.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Si très proche de la cible, passer à la prochaine case
      if (distance < 0.1) {
        return {
          ...mob,
          pathIndex: mob.pathIndex + 1,
          position: { x: targetCell.x, y: targetCell.y },
        }
      }

      // Sinon, se déplacer vers la cible selon la vitesse
      const speed = mob.mob.speed * 0.1 // Ajuster selon la fréquence du ticker
      const moveX = (dx / distance) * speed
      const moveY = (dy / distance) * speed

      return {
        ...mob,
        position: {
          x: mob.position.x + moveX,
          y: mob.position.y + moveY,
        },
      }
    })
    .filter(Boolean) as ActiveMob[] // Supprimer les mobs null
}

export const ticker = createTickerEngine<any>({
  tickIntervalMs: 500, // 500ms = 2 ticks/sec pour le dev (au lieu de 100ms = 10 ticks/sec)
  createInitialState: gameId => ({
    _id: gameId,
    players: [],
    map: [],
    shopTowers: [],
    shopUnits: [],
    activeMobs: [],
    tick: 0,
    host: undefined,
    phase: 'waiting',
    startedAt: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  onTick: async (gameId, state, tick) => {
    // Vérifier les éliminations à chaque tick
    await checkPlayerEliminationService(gameId)

    // Déplacer les mobs
    const updatedMobs = moveMobs(state.activeMobs, state.players)

    // Log seulement si on a des mobs ou tous les 10 ticks
    if (state.activeMobs && state.activeMobs.length > 0) {
      console.log(
        `[Ticker] Tick ${tick} game ${gameId.slice(-6)} - Moving ${state.activeMobs.length} mobs`
      )
    } else if (tick % 10 === 0) {
      console.log(`[Ticker] Tick ${tick} game ${gameId.slice(-6)}`)
    }

    const newState = {
      ...state,
      tick,
      activeMobs: updatedMobs,
      updatedAt: new Date().toISOString(),
    }

    // Log seulement si on a des mobs actifs
    if (newState.activeMobs && newState.activeMobs.length > 0) {
      console.log(`[Ticker] Returning state with ${newState.activeMobs.length} active mobs`)
    }
    return newState
  },
})

// Fonction pour synchroniser l'état du ticker avec la base de données
export async function syncTickerWithDatabase(gameId: string) {
  const { GameModel } = await import('../models/Game')
  const { InGamePlayerModel } = await import('../models/InGamePlayer')

  const game = await GameModel.findById(gameId)
  if (!game) {
    console.warn(`[ticker] Game ${gameId} not found in database`)
    return false
  }

  // Récupérer les InGamePlayers avec les données complètes
  const inGamePlayers = await InGamePlayerModel.find({ gameId }).populate('player').exec()

  // Syncing with database silently

  // Convertir le document MongoDB en objet JavaScript simple
  const gameData = game.toObject() as any

  // Récupérer l'état actuel du ticker
  const currentTickerState = ticker.getState(gameId)
  const realTick = ticker.getRoomTick(gameId) // Le vrai tick du ticker qui tourne !
  const currentActiveMobs = currentTickerState?.activeMobs || []

  console.log(
    `[syncTickerWithDatabase] Real tick: ${realTick}, state tick: ${currentTickerState?.tick || 0}`
  )

  ticker.mutate(gameId, currentState => {
    // Si on a déjà un état valide, préserver l'état existant (tick, mobs) et juste mettre à jour les données DB
    if (currentState && currentState._id && currentState.tick > 0) {
      console.log(
        `[syncTickerWithDatabase] Preserving existing state with ${currentState.activeMobs.length} mobs, tick: ${currentState.tick}`
      )
      return {
        ...currentState,
        players: inGamePlayers.map(igp => ({
          player: igp.player
            ? {
                _id: igp.player._id?.toString(),
                name: (igp.player as any).name,
              }
            : null,
          status: igp.status,
          gold: igp.gold,
          income: igp.income,
          hp: igp.hp,
          hand: igp.hand || [],
          placedTowers: igp.placedTowers || [],
          incomingUnits: igp.incomingUnits || [],
        })),
        tick: Math.max(realTick, currentState.tick), // Utiliser le vrai tick !
        updatedAt: new Date().toISOString(),
      }
    }

    // Sinon, créer un nouvel état complet
    return {
      _id: gameData._id.toString(),
      players: inGamePlayers.map(igp => ({
        player: igp.player
          ? {
              _id: igp.player._id?.toString(),
              name: (igp.player as any).name,
            }
          : null,
        status: igp.status,
        gold: igp.gold,
        income: igp.income,
        hp: igp.hp,
        hand: igp.hand || [],
        placedTowers: igp.placedTowers || [],
        incomingUnits: igp.incomingUnits || [],
      })),
      map: gameData.map || [],
      shopTowers: gameData.shopTowers || [],
      shopUnits: gameData.shopUnits || [],
      activeMobs: currentActiveMobs,
      tick: Math.max(realTick, currentState?.tick || 0), // Utiliser le vrai tick du ticker !
      host: gameData.host?.toString(),
      phase: gameData.phase || 'waiting',
      startedAt: gameData.startedAt?.toISOString(),
      createdAt: gameData.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: gameData.updatedAt?.toISOString() || new Date().toISOString(),
    }
  })

  // Debug: log activeMobs après sync
  const finalState = ticker.getState(gameId)
  // Sync completed

  // Ticker synchronized successfully
  return true
}
