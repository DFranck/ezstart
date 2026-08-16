import { findOneAndUpdate } from '../utils/mongoose-query.js'
import { getMonsterModel } from '../models/monster.js'

const SWARFARM_API = 'https://swarfarm.com/api/v2/monsters/'
const SWARFARM_IMAGE_BASE = 'https://swarfarm.com/static/herders/images/monsters/'

interface SwarfarmMonster {
  id: number
  com2us_id: number
  name: string
  family_id: number
  element: string
  archetype: string
  base_stars: number
  image_filename: string
  raw_hp: number
  raw_attack: number
  raw_defense: number
  speed: number
  crit_rate: number
  crit_damage: number
  resistance: number
  accuracy: number
  obtainable: boolean
  awaken_level: number
  leader_skill: {
    attribute: string
    amount: number
    area: string
  } | null
  skills: Array<{
    scaling_stats?: Array<{ stat: string }>
  }>
}

interface SwarfarmResponse {
  count: number
  next: string | null
  previous: string | null
  results: SwarfarmMonster[]
}

/**
 * Fetch all monsters from SWARFARM API (handles pagination)
 */
async function fetchAllMonsters(): Promise<SwarfarmMonster[]> {
  const allMonsters: SwarfarmMonster[] = []
  let url: string | null = `${SWARFARM_API}?page_size=100`

  while (url) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`SWARFARM API error: ${response.status} ${response.statusText}`)
    }
    const data = (await response.json()) as SwarfarmResponse
    allMonsters.push(...data.results)
    url = data.next
  }

  return allMonsters
}

/**
 * Map SWARFARM element string to our MonsterElement type
 */
function mapElement(element: string): 'fire' | 'water' | 'wind' | 'light' | 'dark' {
  const map: Record<string, 'fire' | 'water' | 'wind' | 'light' | 'dark'> = {
    Fire: 'fire',
    Water: 'water',
    Wind: 'wind',
    Light: 'light',
    Dark: 'dark',
  }
  return map[element] || 'fire'
}

/**
 * Map SWARFARM archetype string to our MonsterArchetype type
 */
function mapArchetype(archetype: string): 'attack' | 'defense' | 'support' | 'hp' {
  const map: Record<string, 'attack' | 'defense' | 'support' | 'hp'> = {
    Attack: 'attack',
    Defense: 'defense',
    Support: 'support',
    HP: 'hp',
  }
  return map[archetype] || 'support'
}

/**
 * Extract scaling stats from SWARFARM skills data
 */
function extractScalesWith(monster: SwarfarmMonster): string[] {
  const scales = new Set<string>()
  for (const skill of monster.skills || []) {
    for (const stat of skill.scaling_stats || []) {
      scales.add(stat.stat)
    }
  }
  return [...scales]
}

/**
 * Assign build archetypes based on SWARFARM archetype + base stats
 */
function assignBuildArchetypes(monster: SwarfarmMonster): string[] {
  const builds: string[] = []

  // Based on SWARFARM archetype
  if (monster.archetype === 'Attack') {
    builds.push('speed-dps', 'cleave')
    if (monster.speed >= 110) builds.push('speed-dps')
  }
  if (monster.archetype === 'Defense') {
    builds.push('def-nuker', 'tank-support')
  }
  if (monster.archetype === 'Support') {
    builds.push('tank-support', 'healer', 'cc-debuffer')
  }
  if (monster.archetype === 'HP') {
    builds.push('bruiser', 'tank-support')
  }

  // Based on stats
  if (monster.speed >= 115) builds.push('speed-leader')
  if (monster.raw_attack >= 800) builds.push('one-shot-nuker')
  if (monster.raw_defense >= 700) builds.push('def-nuker')
  if (monster.resistance >= 40) builds.push('raid-support')

  return [...new Set(builds)]
}

/**
 * Import all monsters from SWARFARM API into MongoDB
 * Filters: obtainable=true, awakenLevel=1 (awakened), naturalStars >= 2
 * Returns the number of monsters imported
 */
export async function importMonsters(): Promise<number> {
  const allMonsters = await fetchAllMonsters()

  // Filter: obtainable, awakened (awaken_level=1), nat 2+
  const filtered = allMonsters.filter(
    m => m.obtainable && m.awaken_level === 1 && m.base_stars >= 2
  )

  const MonsterModel = await getMonsterModel()
  let importedCount = 0

  // Upsert each monster
  for (const m of filtered) {
    const monsterData = {
      id: m.id,
      com2usId: m.com2us_id,
      name: m.name,
      familyId: m.family_id,
      element: mapElement(m.element),
      archetype: mapArchetype(m.archetype),
      naturalStars: m.base_stars,
      imageUrl: `${SWARFARM_IMAGE_BASE}${m.image_filename}`,
      imageFilename: m.image_filename,
      baseHp: m.raw_hp,
      baseAttack: m.raw_attack,
      baseDefense: m.raw_defense,
      speed: m.speed,
      critRate: m.crit_rate,
      critDamage: m.crit_damage,
      resistance: m.resistance,
      accuracy: m.accuracy,
      buildArchetypes: assignBuildArchetypes(m),
      scalesWith: extractScalesWith(m),
      leaderSkill: m.leader_skill
        ? {
            attribute: m.leader_skill.attribute,
            amount: m.leader_skill.amount,
            area: m.leader_skill.area,
          }
        : undefined,
      obtainable: m.obtainable,
      awakenLevel: m.awaken_level,
    }

    await findOneAndUpdate(MonsterModel, { id: m.id }, monsterData, {
      upsert: true,
      new: true,
    })
    importedCount++
  }

  return importedCount
}
