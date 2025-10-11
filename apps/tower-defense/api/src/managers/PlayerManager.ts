/**
 * PlayerManager - Socket session management
 */

export interface PlayerSession {
  playerId: string
  socketId: string
  name: string
  currentGameId?: string
}

class PlayerManager {
  private sessions = new Map<string, PlayerSession>() // socketId → session
  private players = new Map<string, PlayerSession>() // playerId → session

  registerSession(playerId: string, socketId: string, name: string): void {
    const session: PlayerSession = { playerId, socketId, name }
    this.sessions.set(socketId, session)
    this.players.set(playerId, session)
    console.log(`[PlayerManager] Registered ${name} (${socketId})`)
  }

  getSessionBySocket(socketId: string): PlayerSession | undefined {
    return this.sessions.get(socketId)
  }

  getSessionByPlayerId(playerId: string): PlayerSession | undefined {
    return this.players.get(playerId)
  }

  setCurrentGame(socketId: string, gameId: string): void {
    const session = this.sessions.get(socketId)
    if (session) {
      session.currentGameId = gameId
    }
  }

  disconnectSession(socketId: string): void {
    const session = this.sessions.get(socketId)
    if (session) {
      this.players.delete(session.playerId)
      this.sessions.delete(socketId)
      console.log(`[PlayerManager] Disconnected ${session.name}`)
    }
  }

  getStats() {
    return {
      totalSessions: this.sessions.size,
      activePlayers: this.players.size,
    }
  }
}

export const playerManager = new PlayerManager()
