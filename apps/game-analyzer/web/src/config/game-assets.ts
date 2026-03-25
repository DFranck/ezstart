// ── Summoners War asset paths ──

/** Rune set icons (64x64 PNG) */
export const RUNE_SET_ICONS: Record<string, string> = {
  violent: '/images/games/runes/violent.png',
  swift: '/images/games/runes/swift.png',
  rage: '/images/games/runes/rage.png',
  fatal: '/images/games/runes/fatal.png',
  despair: '/images/games/runes/despair.png',
  blade: '/images/games/runes/blade.png',
  focus: '/images/games/runes/focus.png',
  guard: '/images/games/runes/guard.png',
  energy: '/images/games/runes/energy.png',
  endure: '/images/games/runes/endure.png',
  shield: '/images/games/runes/shield.png',
  revenge: '/images/games/runes/revenge.png',
  will: '/images/games/runes/will.png',
  nemesis: '/images/games/runes/nemesis.png',
  vampire: '/images/games/runes/vampire.png',
  destroy: '/images/games/runes/destroy.png',
  fight: '/images/games/runes/fight.png',
  determination: '/images/games/runes/determination.png',
  enhance: '/images/games/runes/enhance.png',
  accuracy: '/images/games/runes/accuracy.png',
  tolerance: '/images/games/runes/tolerance.png',
  seal: '/images/games/runes/seal.png',
  intangible: '/images/games/runes/intangible.png',
}

/** Rune quality backgrounds (128x128 PNG) */
export const RUNE_QUALITY_BG: Record<string, string> = {
  normal: '/images/games/runes/bg_normal.png',
  magic: '/images/games/runes/bg_magic.png',
  rare: '/images/games/runes/bg_rare.png',
  hero: '/images/games/runes/bg_hero.png',
  legend: '/images/games/runes/bg_legend.png',
}

/** Enchanted gem icons by rarity (128x128 PNG) */
export const GEM_ICONS: Record<string, string> = {
  common: '/images/games/gems/common.png',
  magic: '/images/games/gems/magic.png',
  rare: '/images/games/gems/rare.png',
  hero: '/images/games/gems/hero.png',
  legend: '/images/games/gems/legend.png',
  immemorial: '/images/games/gems/immemorial.png',
}

/** Small enchanted indicator icon (25x25 PNG) */
export const GEM_ENCHANTED_ICON = '/images/games/gems/enchanted.png'

/** Grindstone icons by rarity (128x128 PNG) */
export const GRIND_ICONS: Record<string, string> = {
  common: '/images/games/grinds/common.png',
  magic: '/images/games/grinds/magic.png',
  rare: '/images/games/grinds/rare.png',
  hero: '/images/games/grinds/hero.png',
  legend: '/images/games/grinds/legend.png',
}

/** Artifact attribute icons (128x128 PNG) — element-based */
export const ARTIFACT_ATTRIBUTE_ICONS: Record<string, string> = {
  fire: '/images/games/artifacts/fire.png',
  water: '/images/games/artifacts/water.png',
  wind: '/images/games/artifacts/wind.png',
  light: '/images/games/artifacts/light.png',
  dark: '/images/games/artifacts/dark.png',
}

/**
 * Artifact type icons — not available as sprites.
 * No official or community-sourced artifact type icons (attack, defense, hp, support)
 * were found in swarfarm, swarfarm-fe, or the SW fandom wiki.
 * Use text/emoji fallbacks until icons are sourced manually.
 */
export const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  attack: 'ATK',
  defense: 'DEF',
  hp: 'HP',
  support: 'SUP',
}
