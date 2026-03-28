export type MonsterElement = 'fire' | 'water' | 'wind' | 'light' | 'dark'
export type MonsterArchetype = 'attack' | 'defense' | 'support' | 'hp'

export interface Monster {
  id: number
  com2usId: number
  name: string
  familyId: number
  element: MonsterElement
  archetype: MonsterArchetype
  naturalStars: number
  imageUrl: string
  imageFilename: string
  baseHp: number
  baseAttack: number
  baseDefense: number
  speed: number
  critRate: number
  critDamage: number
  resistance: number
  accuracy: number
  buildArchetypes: string[]
  scalesWith: string[]
  leaderSkill?: {
    attribute: string
    amount: number
    area: string
  }
  obtainable: boolean
  awakenLevel: number
}
