import { createTickerEngine } from '@ezstart/express-core'
import type { ActiveMob, InGamePlayer } from '@tower-defense/types'
import { findPath } from '@tower-defense/utils'
import { updatePlayerHpService } from '../services/updatePlayerStatsService.js'
import { updatePlayerStatusService } from '../services/updatePlayerStatusService.js'
import { checkEndGame } from '../utils/checkEndGame.js'
import { getIO } from '../socketInstance.js'

// Fonction pour détecter collision entre 2 mobs
function checkCollision(mob1: ActiveMob, mob2: ActiveMob): boolean {
  const dx = mob1.position.x - mob2.position.x
  const dy = mob1.position.y - mob2.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  const radius1 = mob1.mob.collisionRadius ?? 0.3
  const radius2 = mob2.mob.collisionRadius ?? 0.3
  const minDistance = radius1 + radius2

  return distance < minDistance
}

// Spatial grid pour optimiser les collisions O(n²) → O(n)
class SpatialGrid {
  private cellSize: number
  private grid: Map<string, ActiveMob[]>

  constructor(cellSize: number = 2) {
    this.cellSize = cellSize
    this.grid = new Map()
  }

  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize)
    const cellY = Math.floor(y / this.cellSize)
    return `${cellX},${cellY}`
  }

  clear() {
    this.grid.clear()
  }

  insert(mob: ActiveMob) {
    const key = this.getKey(mob.position.x, mob.position.y)
    if (!this.grid.has(key)) {
      this.grid.set(key, [])
    }
    this.grid.get(key)!.push(mob)
  }

  getNearby(mob: ActiveMob): ActiveMob[] {
    const nearby: ActiveMob[] = []
    const centerX = Math.floor(mob.position.x / this.cellSize)
    const centerY = Math.floor(mob.position.y / this.cellSize)

    // Chercher dans la cellule actuelle et les 8 voisines
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${centerX + dx},${centerY + dy}`
        const mobs = this.grid.get(key)
        if (mobs) {
          nearby.push(...mobs)
        }
      }
    }

    return nearby
  }
}

// Fonction pour appliquer séparation entre mobs qui se chevauchent
function applySeparation(mob: ActiveMob, spatialGrid: SpatialGrid): { x: number; y: number } {
  let separationX = 0
  let separationY = 0
  let count = 0

  // Récupérer seulement les mobs proches (au lieu de TOUS les mobs)
  const nearbyMobs = spatialGrid.getNearby(mob)

  for (const other of nearbyMobs) {
    if (other.id === mob.id) continue

    // Ignorer si l'un des deux peut voler
    if (mob.mob.canFly || other.mob.canFly) continue

    if (checkCollision(mob, other)) {
      // Pousser dans la direction opposée
      const dx = mob.position.x - other.position.x
      const dy = mob.position.y - other.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 0.01) {
        separationX += dx / distance
        separationY += dy / distance
        count++
      }
    }
  }

  if (count > 0) {
    separationX /= count
    separationY /= count
  }

  return { x: separationX, y: separationY }
}

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
            return null as any // Marquer pour suppression
          }

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

// Fonction pour déplacer les mobs sur leur path avec collision RTS-style
function moveMobs(activeMobs: ActiveMob[], players: InGamePlayer[]): ActiveMob[] {
  if (!activeMobs || !Array.isArray(activeMobs)) {
    return []
  }

  // Phase 1: Calculer les mouvements souhaités
  const mobsWithMovement = activeMobs
    .map(mob => {
      // Trouver le joueur cible
      const targetPlayer = players.find(p => p.player?._id?.toString() === mob.targetPlayerId)
      if (!targetPlayer) {
        return null
      }

      // Calculer le path du joueur cible
      const blockedCells = targetPlayer.placedTowers.flatMap((t: any) => t.coveredCells)
      const path = findPath(blockedCells)

      if (path.length === 0 || mob.pathIndex >= path.length) {
        // Mob a atteint la fin - infliger des dégâts au joueur
        const damage = mob.mob.damage || 10
        return { mob, movement: null, reachedEnd: true, damage }
      }

      // Position cible (prochaine case du path)
      const targetCell = path[mob.pathIndex]
      if (!targetCell) {
        console.warn(`[moveMobs] Invalid pathIndex ${mob.pathIndex} for path length ${path.length}`)
        return null
      }

      // Appliquer l'offset persistant au waypoint cible
      const offsetX = mob.pathOffset?.x ?? 0
      const offsetY = mob.pathOffset?.y ?? 0
      const targetX = targetCell.x + offsetX
      const targetY = targetCell.y + offsetY

      // Calculer le mouvement vers la position cible (avec offset)
      const dx = targetX - mob.position.x
      const dy = targetY - mob.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Si très proche de la cible (avec offset), passer à la prochaine case
      if (distance < 1.5) {
        return {
          mob,
          movement: { x: 0, y: 0 },
          advanceWaypoint: true,
          targetCell: { x: targetX, y: targetY }, // Position avec offset
          reachedEnd: false
        }
      }

      // Calculer le mouvement désiré
      const rawSpeed = Math.min(mob.mob.speed, 10)
      const speed = rawSpeed * 0.05
      const moveX = (dx / distance) * speed
      const moveY = (dy / distance) * speed

      return {
        mob,
        movement: { x: moveX, y: moveY },
        advanceWaypoint: false,
        reachedEnd: false
      }
    })
    .filter(Boolean) as any[]

  // Phase 2: Construire spatial grid pour optimiser collisions
  const spatialGrid = new SpatialGrid(2) // Cellules de 2×2 tiles
  for (const item of mobsWithMovement) {
    if (!item.reachedEnd && !item.advanceWaypoint) {
      spatialGrid.insert(item.mob)
    }
  }

  // Phase 3: Appliquer collision/séparation avec spatial grid
  return mobsWithMovement.map(({ mob, movement, advanceWaypoint, targetCell, reachedEnd, damage }) => {
    if (reachedEnd) {
      return { ...mob, _reachedEnd: true, _damage: damage } as any
    }

    if (advanceWaypoint) {
      return {
        ...mob,
        pathIndex: mob.pathIndex + 1,
        position: { x: targetCell.x, y: targetCell.y },
      }
    }

    // Appliquer séparation si collision activée (avec spatial grid optimisé)
    let finalX = mob.position.x + movement.x
    let finalY = mob.position.y + movement.y

    if (!mob.mob.canFly) {
      const separation = applySeparation(mob, spatialGrid)
      // Appliquer séparation avec force plus importante pour séparer visuellement
      finalX += separation.x * 0.08
      finalY += separation.y * 0.08
    }

    return {
      ...mob,
      position: {
        x: finalX,
        y: finalY,
      },
    }
  }).filter(Boolean) as ActiveMob[]
}

export const ticker = createTickerEngine<any>({
  tickIntervalMs: 250, // 250ms = 4 ticks/sec (balance gameplay/performance)
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
    const tickStartTime = Date.now()
    if (!state._lastTickTime) {
      state._lastTickTime = tickStartTime
    } else {
      state._lastTickTime = tickStartTime
    }

    // Plus de requête DB ici - l'élimination est gérée en mémoire après les dégâts

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

    // Appliquer les dégâts aux joueurs et détecter les éliminations en mémoire
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

        // Vérifier élimination en mémoire (pas de DB!)
        if (newHp <= 0 && p.status === 'active') {
          console.log(`[Ticker] 💀 Player ${p.player?.name} eliminated (HP: 0)`)

          // Mettre à jour le status en DB (async)
          updatePlayerStatusService({
            gameId,
            playerId: p.player?._id?.toString(),
            status: 'eliminated'
          }).catch(err => console.error('[Ticker] Failed to update player status:', err))

          // Émettre événement d'élimination
          getIO().to(gameId).emit('playerEliminated', {
            gameId,
            playerId: p.player?._id?.toString(),
            playerName: p.player?.name,
            reason: 'HP reached zero',
            hp: newHp
          })

          return { ...p, hp: newHp, status: 'eliminated' as const }
        }

        return { ...p, hp: newHp }
      }
      return p
    })

    // Vérifier si le jeu doit se terminer après éliminations
    const hasEliminations = updatedPlayers.some((p: InGamePlayer) => p.status === 'eliminated')
    if (hasEliminations) {
      // Vérifier la fin du jeu (async, sans bloquer)
      checkEndGame(gameId).catch(err => console.error('[Ticker] Failed to check end game:', err))
    }

    const newState = {
      ...state,
      players: updatedPlayers,
      tick,
      activeMobs: finalMobs,
      updatedAt: new Date().toISOString(),
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
