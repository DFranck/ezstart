// path: @tower-defense/config/src/elements.ts
// File header: @tower-defense/config/src/elements.ts

/**
 * Pokémon-like elemental system:
 * - Types, labels, colors
 * - Full effectiveness chart (2, 1, 0.5, 0)
 * - Helpers to compute multipliers vs 1 or 2 defender types
 * - Optional STAB (Same-Type Attack Bonus)
 */

export const ELEMENTAL_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const

export type ElementalType = (typeof ELEMENTAL_TYPES)[number]

export const ELEMENTAL_LABELS: Readonly<Record<ElementalType, string>> = {
  normal: 'Normal',
  fire: 'Fire',
  water: 'Water',
  electric: 'Electric',
  grass: 'Grass',
  ice: 'Ice',
  fighting: 'Fighting',
  poison: 'Poison',
  ground: 'Ground',
  flying: 'Flying',
  psychic: 'Psychic',
  bug: 'Bug',
  rock: 'Rock',
  ghost: 'Ghost',
  dragon: 'Dragon',
  dark: 'Dark',
  steel: 'Steel',
  fairy: 'Fairy',
} as const

// Colors close to modern Pokémon palettes
export const ELEMENTAL_COLORS: Readonly<Record<ElementalType, `#${string}`>> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
} as const
// path: @tower-defense/config/src/elements.ts
// ... tes imports/types/const ELEMENTAL_TYPES, ElementalType, colors, labels ...

type Eff = 0 | 0.5 | 1 | 2

/** Build a fully-typed effectiveness row with defaults = 1 (neutral). */
function makeRow(
  overrides: Readonly<Partial<Record<ElementalType, Eff>>>
): Readonly<Record<ElementalType, Eff>> {
  const out: Record<ElementalType, Eff> = {} as Record<ElementalType, Eff>
  for (const t of ELEMENTAL_TYPES) out[t] = 1 // neutral by default
  for (const k of Object.keys(overrides) as ElementalType[]) {
    const v = overrides[k]
    if (v !== undefined) out[k] = v
  }
  return out
}

/**
 * Type effectiveness matrix (attacker -> defender -> multiplier)
 * Values: 2 (super), 1 (neutral), 0.5 (not very), 0 (no effect)
 * Gen VI+ (incl. Fairy)
 */
export const TYPE_EFFECTIVENESS: Readonly<
  Record<ElementalType, Readonly<Record<ElementalType, Eff>>>
> = {
  normal: makeRow({ rock: 0.5, ghost: 0, steel: 0.5 }),
  fire: makeRow({
    grass: 2,
    ice: 2,
    bug: 2,
    steel: 2,
    fire: 0.5,
    water: 0.5,
    rock: 0.5,
    dragon: 0.5,
  }),
  water: makeRow({ fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 }),
  electric: makeRow({ water: 2, flying: 2, grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0 }),
  grass: makeRow({
    water: 2,
    ground: 2,
    rock: 2,
    fire: 0.5,
    grass: 0.5,
    poison: 0.5,
    flying: 0.5,
    bug: 0.5,
    dragon: 0.5,
    steel: 0.5,
  }),
  ice: makeRow({
    grass: 2,
    ground: 2,
    flying: 2,
    dragon: 2,
    fire: 0.5,
    water: 0.5,
    ice: 0.5,
    steel: 0.5,
  }),
  fighting: makeRow({
    normal: 2,
    rock: 2,
    steel: 2,
    ice: 2,
    dark: 2,
    ghost: 0,
    flying: 0.5,
    poison: 0.5,
    bug: 0.5,
    psychic: 0.5,
    fairy: 0.5,
  }),
  poison: makeRow({
    grass: 2,
    fairy: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
  }),
  ground: makeRow({
    fire: 2,
    electric: 2,
    poison: 2,
    rock: 2,
    steel: 2,
    grass: 0.5,
    bug: 0.5,
    flying: 0,
  }),
  flying: makeRow({ grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 }),
  psychic: makeRow({ fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 }),
  bug: makeRow({
    grass: 2,
    psychic: 2,
    dark: 2,
    fire: 0.5,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    ghost: 0.5,
    steel: 0.5,
    fairy: 0.5,
  }),
  rock: makeRow({ fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 }),
  ghost: makeRow({ psychic: 2, ghost: 2, dark: 0.5, normal: 0 }),
  dragon: makeRow({ dragon: 2, steel: 0.5, fairy: 0 }),
  dark: makeRow({ psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 }),
  steel: makeRow({ rock: 2, ice: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 }),
  fairy: makeRow({ fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 }),
}

/** Get multiplier attacker -> defender (single type). */
export function multiplierVsSingle(
  attacker: ElementalType,
  defender: ElementalType
): 0 | 0.5 | 1 | 2 {
  const row = TYPE_EFFECTIVENESS[attacker]
  return (row[defender] ?? 1) as 0 | 0.5 | 1 | 2
}

/** Get total multiplier vs mono/dual-type defenders (product of both). */
export function multiplierVs(
  attacker: ElementalType,
  defenders: readonly [ElementalType] | readonly [ElementalType, ElementalType]
): 0 | 0.25 | 0.5 | 1 | 2 | 4 {
  const x1 = multiplierVsSingle(attacker, defenders[0])
  const x2 = defenders[1] ? multiplierVsSingle(attacker, defenders[1]) : 1
  const prod = x1 * x2 // 0, 0.25, 0.5, 1, 2, 4
  return prod as 0 | 0.25 | 0.5 | 1 | 2 | 4
}

/** Apply optional STAB (Same-Type Attack Bonus). Default 1.5x if attack type in attackerTypes. */
export function applySTAB(
  base: 0 | 0.25 | 0.5 | 1 | 2 | 4,
  attackType: ElementalType,
  attackerTypes: readonly [ElementalType] | readonly [ElementalType, ElementalType],
  stabValue: 1 | 1.2 | 1.5 = 1.5
): 0 | 0.25 | 0.5 | 0.75 | 1 | 1.2 | 1.5 | 2 | 3 | 4 | 6 {
  const hasSTAB = attackerTypes.includes(attackType)
  const out = hasSTAB ? base * stabValue : base
  return out as any
}
