// ── Per-game asset configs ──

export {
  SW_RUNE_SET_ICONS,
  SW_RUNE_QUALITY_BG,
  SW_GEM_ICONS,
  SW_GEM_ENCHANTED_ICON,
  SW_GRIND_ICONS,
  SW_ARTIFACT_ATTRIBUTE_ICONS,
  SW_ARTIFACT_TYPE_LABELS,
} from './summoners-war'

export { NIKKE_BASE } from './nikke'

// ── Common game config ──

function gamePath(game: string) {
  return `/images/games/${game}`
}

export const GAME_CONFIG: Record<string, { logo: string; bg: string; banner: string }> = {
  'summoners-war': {
    logo: `${gamePath('summoners-war')}/logo.png`,
    bg: `${gamePath('summoners-war')}/bg.jpg`,
    banner: `${gamePath('summoners-war')}/banner.svg`,
  },
  'nikke': {
    logo: `${gamePath('nikke')}/logo.png`,
    bg: `${gamePath('nikke')}/bg.jpg`,
    banner: `${gamePath('nikke')}/banner.svg`,
  },
}
