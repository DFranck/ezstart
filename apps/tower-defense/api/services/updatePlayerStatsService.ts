import { PlayerModel } from '../models/Player.js'

export interface GameResult {
  playerId: string
  rank: number
  status: 'active' | 'left' | 'eliminated'
}

export async function updatePlayerStatsService(gameResults: GameResult[]) {
  const bulkOps = []

  for (const result of gameResults) {
    const { playerId, rank, status } = result
    const isWinner = rank === 1 && status === 'active'

    // Calculer les changements de rank basés sur la performance
    let rankChange = 0
    if (isWinner) {
      rankChange = 25 // +25 points pour gagner
    } else if (rank === 2) {
      rankChange = 10 // +10 points pour 2ème place
    } else if (status === 'left') {
      rankChange = -15 // -15 points pour avoir quitté
    } else {
      rankChange = -5 // -5 points pour avoir perdu
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: playerId },
        update: {
          $inc: {
            gamesPlayed: 1,
            gamesWon: isWinner ? 1 : 0,
            rank: rankChange,
          },
        },
      },
    })
  }

  if (bulkOps.length > 0) {
    await PlayerModel.bulkWrite(bulkOps)
  }

  console.log(`Updated stats for ${gameResults.length} players`)
}