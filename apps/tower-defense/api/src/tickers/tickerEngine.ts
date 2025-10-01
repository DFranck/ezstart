import { createTickerEngine } from '@ezstart/express-core'
import type { ActiveMob, InGamePlayer } from '@tower-defense/types'
import { findPath } from '@tower-defense/utils'
import { checkPlayerEliminationService } from '../services/checkPlayerEliminationService.js'
import { updatePlayerHpService } from '../services/updatePlayerStatsService.js'
import { getIO } from '../socketInstance.js'

// Fonction pour faire tirer les tours sur les mobs
function processTowerAttacks(
  gameId: string,
  activeMobs: ActiveMob[],
  players: InGamePlayer[]
): { updatedMobs: ActiveMob[]; projectiles: any[] } {
  let updatedMobs = [...activeMobs]
  const projectiles: any[] = []

  // Pour chaque joueur
  for (const player of players) {
    const playerId = player.player?._id?.toString()
    if (!playerId) continue

    // Pour chaque tour du joueur
    for (const tower of player.placedTowers || []) {
      const towerRange = tower.range || 5
      const towerDamage = tower.damage || 10
      const towerSpeed = tower.speed || 1 // Tirs par tick

      // Chaque cellule couverte par la tour peut tirer
      for (const cell of tower.coveredCells || []) {
        // Trouver les mobs à portée de cette cellule
        const mobsInRange = updatedMobs.filter(mob => {
          if (mob.targetPlayerId !== playerId) return false

          const dx = mob.position.x - cell.x
          const dy = mob.position.y - cell.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          return distance <= towerRange
        })

        if (mobsInRange.length === 0) continue

        // Tirer sur les mobs selon la stratégie de ciblage
        const targetCount = towerSpeed // Nombre de tirs par tick
        const targets = mobsInRange.slice(0, targetCount) // Pour l'instant, on prend les premiers

        // Appliquer les dégâts
        updatedMobs = updatedMobs.map(mob => {
          if (!targets.find(t => t.id === mob.id)) return mob

          const newHp = mob.currentHp - towerDamage

          // Créer un projectile visuel
          projectiles.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            from: { x: cell.x, y: cell.y },
            to: { x: mob.position.x, y: mob.position.y },
            damage: towerDamage,
            targetMobId: mob.id,
          })

          if (newHp <= 0) {
            console.log(`[Tower] 💀 Mob ${mob.id} (${mob.mob.name}) killed by tower at (${cell.x},${cell.y})!`)
            return null as any // Marquer pour suppression
          }

          console.log(
            `[Tower] 🎯 Tower cell (${cell.x},${cell.y}) hit mob ${mob.id} for ${towerDamage} damage! HP: ${mob.currentHp} → ${newHp}`
          )

          return {
            ...mob,
            currentHp: newHp,
          }
        }).filter(Boolean) // Supprimer les mobs morts (null)
      }
    }
  }

  return { updatedMobs, projectiles }
}

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
      const blockedCells = targetPlayer.placedTowers.flatMap((t: any) => t.coveredCells)
      const path = findPath(blockedCells)

      console.log(
        `[moveMobs] Mob ${mob.id}: pathIndex=${mob.pathIndex}, pathLength=${path.length}, position=(${mob.position.x}, ${mob.position.y})`
      )

      if (path.length === 0 || mob.pathIndex >= path.length) {
        // Mob a atteint la fin - infliger des dégâts au joueur
        const damage = mob.mob.damage || 10
        console.log(`[moveMobs] 💥 Mob ${mob.id} (${mob.mob.name}) reached end! Dealing ${damage} damage to player ${mob.targetPlayerId}`)

        // Marquer ce mob pour infliger des dégâts (sera géré dans onTick)
        return { ...mob, _reachedEnd: true, _damage: damage } as any
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
      if (distance < 1.5) {
        return {
          ...mob,
          pathIndex: mob.pathIndex + 1,
          position: { x: targetCell.x, y: targetCell.y },
        }
      }

      // Sinon, se déplacer vers la cible selon la vitesse
      // Limiter la vitesse à max 10 pour éviter les téléportations
      const rawSpeed = Math.min(mob.mob.speed, 10)
      const speed = rawSpeed * 0.1 // Ajuster selon la fréquence du ticker (500ms)
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

    // 1. Faire tirer les tours sur les mobs
    const { updatedMobs: mobsAfterAttacks, projectiles } = processTowerAttacks(
      gameId,
      state.activeMobs,
      state.players
    )

    // Émettre les projectiles pour l'affichage visuel
    if (projectiles.length > 0) {
      getIO().to(gameId).emit('projectiles', projectiles)
    }

    // 2. Déplacer les mobs survivants
    const updatedMobs = moveMobs(mobsAfterAttacks, state.players)

    // 3. Traiter les dégâts des mobs qui ont atteint la fin
    const mobsReachedEnd = updatedMobs.filter((m: any) => m._reachedEnd)
    const finalMobs = updatedMobs.filter((m: any) => !m._reachedEnd)

    // Appliquer les dégâts aux joueurs
    const updatedPlayers = state.players.map((p: InGamePlayer) => {
      const damageToTake = mobsReachedEnd
        .filter((m: any) => m.targetPlayerId === p.player?._id?.toString())
        .reduce((total: number, m: any) => total + (m._damage || 10), 0)

      if (damageToTake > 0) {
        const newHp = Math.max(0, p.hp - damageToTake)
        console.log(`[Ticker] Player ${p.player?.name} took ${damageToTake} damage! HP: ${p.hp} → ${newHp}`)

        // Sauvegarder en DB (async, sans attendre)
        updatePlayerHpService({
          gameId,
          playerId: p.player?._id?.toString(),
          hp: newHp
        }).catch(err => console.error('[Ticker] Failed to update player HP:', err))

        // Émettre événement de dégât
        getIO().to(gameId).emit('playerDamaged', {
          playerId: p.player?._id?.toString(),
          playerName: p.player?.name,
          damage: damageToTake,
          newHp,
          mobCount: mobsReachedEnd.filter((m: any) => m.targetPlayerId === p.player?._id?.toString()).length
        })

        return { ...p, hp: newHp }
      }
      return p
    })

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
      players: updatedPlayers,
      tick,
      activeMobs: finalMobs,
      updatedAt: new Date().toISOString(),
    }

    // Log seulement si on a des mobs actifs
    if (newState.activeMobs && newState.activeMobs.length > 0) {
      console.log(`[Ticker] Returning state with ${newState.activeMobs.length} active mobs`)
    }

    // Émettre le state mis à jour à tous les clients de la game
    getIO().to(gameId).emit('gameState', { ...newState, _reason: 'tick' })

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
    console.log('[syncTickerWithDatabase] mutate called with currentState:', currentState ? { _id: currentState._id, tick: currentState.tick, phase: currentState.phase } : 'null/undefined')

    // Si on a déjà un état valide avec vraies données de jeu, préserver l'état existant et juste mettre à jour les joueurs depuis DB
    // Conditions: a un _id ET (tick > 0 OU phase='playing' avec des joueurs)
    const hasValidGameData = currentState && currentState._id && (
      currentState.tick > 0 ||
      (currentState.phase === 'playing' && currentState.players && currentState.players.length > 0)
    )

    if (hasValidGameData) {
      console.log(
        `[syncTickerWithDatabase] Preserving existing state with ${currentState.activeMobs.length} mobs, tick: ${currentState.tick}`
      )
      // Pendant le jeu, préserver les placedTowers du ticker (en mémoire) pour éviter de corrompre l'état des mobs
      return {
        ...currentState,
        phase: gameData.phase || 'waiting', // Sync phase from DB
        isSoloMode: gameData.isSoloMode || false, // Sync solo mode from DB
        host: gameData.host?.toString(),
        players: inGamePlayers.map(igp => {
          // Trouver le joueur correspondant dans l'état actuel
          const existingPlayer = currentState.players.find(
            (p: any) => p.player?._id === igp.player?._id?.toString()
          )

          return {
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
            // IMPORTANT: Préserver les tours en mémoire pendant le jeu pour éviter corruption des mobs
            placedTowers: existingPlayer?.placedTowers || igp.placedTowers || [],
            incomingUnits: igp.incomingUnits || [],
          }
        }),
        tick: Math.max(realTick, currentState.tick), // Utiliser le vrai tick !
        updatedAt: new Date().toISOString(),
      }
    }

    // Sinon, créer un nouvel état complet
    console.log('[syncTickerWithDatabase] Creating new complete state from DB with phase:', gameData.phase, 'players:', inGamePlayers.length)
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
      isSoloMode: gameData.isSoloMode || false,
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
