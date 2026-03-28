// ── Summoners War asset paths ──

const BASE = '/images/games/summoners-war'

/** Rune set icons (64x64 PNG) */
export const SW_RUNE_SET_ICONS: Record<string, string> = {
  violent: `${BASE}/runes/violent.png`,
  swift: `${BASE}/runes/swift.png`,
  rage: `${BASE}/runes/rage.png`,
  fatal: `${BASE}/runes/fatal.png`,
  despair: `${BASE}/runes/despair.png`,
  blade: `${BASE}/runes/blade.png`,
  focus: `${BASE}/runes/focus.png`,
  guard: `${BASE}/runes/guard.png`,
  energy: `${BASE}/runes/energy.png`,
  endure: `${BASE}/runes/endure.png`,
  shield: `${BASE}/runes/shield.png`,
  revenge: `${BASE}/runes/revenge.png`,
  will: `${BASE}/runes/will.png`,
  nemesis: `${BASE}/runes/nemesis.png`,
  vampire: `${BASE}/runes/vampire.png`,
  destroy: `${BASE}/runes/destroy.png`,
  fight: `${BASE}/runes/fight.png`,
  determination: `${BASE}/runes/determination.png`,
  enhance: `${BASE}/runes/enhance.png`,
  accuracy: `${BASE}/runes/accuracy.png`,
  tolerance: `${BASE}/runes/tolerance.png`,
  seal: `${BASE}/runes/seal.png`,
  intangible: `${BASE}/runes/intangible.png`,
}

/** Rune quality backgrounds (128x128 PNG) */
export const SW_RUNE_QUALITY_BG: Record<string, string> = {
  normal: `${BASE}/runes/bg_normal.png`,
  magic: `${BASE}/runes/bg_magic.png`,
  rare: `${BASE}/runes/bg_rare.png`,
  hero: `${BASE}/runes/bg_hero.png`,
  legend: `${BASE}/runes/bg_legend.png`,
}

/** Enchanted gem icons by rarity (128x128 PNG) */
export const SW_GEM_ICONS: Record<string, string> = {
  common: `${BASE}/gems/common.png`,
  magic: `${BASE}/gems/magic.png`,
  rare: `${BASE}/gems/rare.png`,
  hero: `${BASE}/gems/hero.png`,
  legend: `${BASE}/gems/legend.png`,
  immemorial: `${BASE}/gems/immemorial.png`,
}

/** Small enchanted indicator icon (25x25 PNG) */
export const SW_GEM_ENCHANTED_ICON = `${BASE}/gems/enchanted.png`

/** Grindstone icons by rarity (128x128 PNG) */
export const SW_GRIND_ICONS: Record<string, string> = {
  common: `${BASE}/grinds/common.png`,
  magic: `${BASE}/grinds/magic.png`,
  rare: `${BASE}/grinds/rare.png`,
  hero: `${BASE}/grinds/hero.png`,
  legend: `${BASE}/grinds/legend.png`,
}

/** Artifact attribute icons (128x128 PNG) — element-based */
export const SW_ARTIFACT_ATTRIBUTE_ICONS: Record<string, string> = {
  fire: `${BASE}/artifacts/fire.png`,
  water: `${BASE}/artifacts/water.png`,
  wind: `${BASE}/artifacts/wind.png`,
  light: `${BASE}/artifacts/light.png`,
  dark: `${BASE}/artifacts/dark.png`,
}

/**
 * Artifact type icons — not available as sprites.
 * No official or community-sourced artifact type icons (attack, defense, hp, support)
 * were found in swarfarm, swarfarm-fe, or the SW fandom wiki.
 * Use text/emoji fallbacks until icons are sourced manually.
 */
export const SW_ARTIFACT_TYPE_LABELS: Record<string, string> = {
  attack: 'ATK',
  defense: 'DEF',
  hp: 'HP',
  support: 'SUP',
}
