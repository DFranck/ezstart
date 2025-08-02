export function extractPlayerId(p: { playerId: string | { _id: string } }): string {
  return typeof p.playerId === 'string' ? p.playerId : p.playerId._id
}
