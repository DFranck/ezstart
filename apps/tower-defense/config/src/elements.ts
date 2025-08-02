export const ELEMENTAL_TYPES = [
  'fire',
  'water',
  'earth',
  'air',
  'lightning',
  'ice',
  'neutral',
] as const;

export const ELEMENTAL_AFFINITIES = {
  fire: { ice: 2, water: 0.5 },
  water: { fire: 2, lightning: 0.5 },
  earth: { lightning: 2, air: 0.5 },
  air: { earth: 2, ice: 0.5 },
  lightning: { water: 2, earth: 0.5 },
  ice: { air: 2, fire: 0.5 },
  neutral: {},
} as const;

export const ELEMENTAL_LABELS = {
  fire: '🔥 Fire',
  water: '💧 Water',
  earth: '🪨 Earth',
  air: '💨 Air',
  lightning: '⚡ Lightning',
  ice: '❄️ Ice',
  neutral: '⚪ Neutral',
} as const;
