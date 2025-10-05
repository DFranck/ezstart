/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║                    TIERS & UPGRADES SYSTEM                         ║
 * ║                                                                    ║
 * ║  🎯 Système de progression flexible et configurable               ║
 * ║  Active/désactive les fonctionnalités selon tes besoins           ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════
// ⚙️ ACTIVATION DES SYSTÈMES
// ═══════════════════════════════════════════════════════════════════════

export const TIER_SYSTEM = {
  ENABLED: true, // true = système de tiers activé, false = tout dispo dès le début
  MAX_TIER: 3, // Nombre de tiers maximum (0 = pas de tiers)
  STARTING_TIER: 1, // Tier de départ
}

// ═══════════════════════════════════════════════════════════════════════
// 📈 PROGRESSION DE TIER (Comment débloquer les tiers)
// ═══════════════════════════════════════════════════════════════════════

export type TierUnlockCondition = {
  type: 'gold_spent' | 'kills' | 'time' | 'waves' | 'manual' // Type de condition
  value: number // Valeur requise
  description: string // Description pour l'UI
}

export const TIER_UNLOCK_CONDITIONS: Record<number, TierUnlockCondition> = {
  2: {
    type: 'gold_spent',
    value: 50, // Dépenser 50 gold
    description: 'Spend 50 gold to unlock Tier 2',
  },
  3: {
    type: 'gold_spent',
    value: 150, // Dépenser 150 gold au total
    description: 'Spend 150 gold to unlock Tier 3',
  },
}

// ═══════════════════════════════════════════════════════════════════════
// 🗼 TIERS - RESTRICTIONS SUR LES TOWERS
// ═══════════════════════════════════════════════════════════════════════

export const TOWER_TIER_RESTRICTIONS = {
  ENABLED: true, // Activer les restrictions par tier sur les towers

  // Restriction par taille de forme (nombre de cellules occupées)
  MAX_SHAPE_SIZE_BY_TIER: {
    1: 1, // Tier 1: max 1 cellule
    2: 2, // Tier 2: max 2 cellules
    3: 9, // Tier 3: max 9 cellules (toutes formes)
  },

  // Prix maximum par tier (optional, undefined = pas de limite)
  MAX_PRICE_BY_TIER: {
    1: 4, // Tier 1: towers jusqu'à 4 gold
    2: 6, // Tier 2: towers jusqu'à 6 gold
    3: undefined, // Tier 3: pas de limite
  },

  // Probabilité d'apparition des towers puissantes par tier (0-1)
  POWERFUL_TOWER_SPAWN_CHANCE: {
    1: 0.1, // Tier 1: 10% de chance d'avoir une tower > prix moyen
    2: 0.3, // Tier 2: 30%
    3: 0.5, // Tier 3: 50%
  },
}

// ═══════════════════════════════════════════════════════════════════════
// 👹 TIERS - RESTRICTIONS SUR LES MOBS
// ═══════════════════════════════════════════════════════════════════════

export const MOB_TIER_RESTRICTIONS = {
  ENABLED: true, // Activer les restrictions par tier sur les mobs

  // Mode de restriction
  MODE: 'stats_scaling' as 'stats_scaling' | 'price_cap' | 'none',
  // 'stats_scaling' = Les stats des mobs sont proportionnelles au tier
  // 'price_cap' = Limite le prix max des mobs selon le tier
  // 'none' = Tous les mobs dispo tout le temps

  // Stats scaling par tier (multiplicateurs)
  STATS_MULTIPLIER_BY_TIER: {
    1: 0.5, // Tier 1: Mobs à 50% de leurs stats max
    2: 0.75, // Tier 2: 75%
    3: 1.0, // Tier 3: 100%
  },

  // Prix maximum par tier (si MODE = 'price_cap')
  MAX_PRICE_BY_TIER: {
    1: 3, // Tier 1: mobs jusqu'à 3 gold
    2: 5, // Tier 2: mobs jusqu'à 5 gold
    3: undefined, // Tier 3: pas de limite
  },
}

// ═══════════════════════════════════════════════════════════════════════
// 💰 TIERS - BONUS D'INCOME
// ═══════════════════════════════════════════════════════════════════════

export const TIER_INCOME_BONUS = {
  ENABLED: true, // Activer les bonus d'income par tier

  // Bonus d'income par tier (ajouté au BASE_INCOME)
  BONUS_BY_TIER: {
    1: 0, // Tier 1: +0 income
    2: 1, // Tier 2: +1 income
    3: 3, // Tier 3: +3 income
  },
}

// ═══════════════════════════════════════════════════════════════════════
// 🎁 UPGRADES - AMÉLIORATIONS ACHETABLES
// ═══════════════════════════════════════════════════════════════════════

export type UpgradeType =
  | 'income' // Augmente l'income passif
  | 'tower_damage' // Augmente les dégâts des towers
  | 'tower_range' // Augmente la portée des towers
  | 'tower_speed' // Augmente la vitesse d'attaque des towers
  | 'mob_debuff' // Réduit les stats des mobs adverses
  | 'gold_per_kill' // Augmente l'or gagné par kill
  | 'aura' // Aura passive (future)
  | 'ability' // Capacité spéciale (future)

export type Upgrade = {
  id: string
  name: string
  description: string
  type: UpgradeType
  cost: number
  effect: number // Valeur de l'effet (dépend du type)
  maxLevel: number // Nombre max d'achats (0 = illimité)
  requiredTier: number // Tier requis pour débloquer
}

export const UPGRADES_SYSTEM = {
  ENABLED: false, // ⚠️ Désactivé pour l'instant, active quand prêt

  AVAILABLE_UPGRADES: [
    // Income upgrades
    {
      id: 'income_1',
      name: 'Economy I',
      description: '+1 passive income',
      type: 'income' as const,
      cost: 20,
      effect: 1,
      maxLevel: 3,
      requiredTier: 1,
    },
    {
      id: 'income_2',
      name: 'Economy II',
      description: '+2 passive income',
      type: 'income' as const,
      cost: 50,
      effect: 2,
      maxLevel: 2,
      requiredTier: 2,
    },

    // Tower upgrades
    {
      id: 'tower_damage_1',
      name: 'Firepower I',
      description: '+20% tower damage',
      type: 'tower_damage' as const,
      cost: 30,
      effect: 0.2,
      maxLevel: 5,
      requiredTier: 1,
    },
    {
      id: 'tower_range_1',
      name: 'Long Range I',
      description: '+1 tower range',
      type: 'tower_range' as const,
      cost: 25,
      effect: 1,
      maxLevel: 3,
      requiredTier: 1,
    },

    // Kill reward upgrade
    {
      id: 'bounty_1',
      name: 'Bounty Hunter',
      description: '+50% gold per kill',
      type: 'gold_per_kill' as const,
      cost: 40,
      effect: 0.5,
      maxLevel: 2,
      requiredTier: 2,
    },
  ] as Upgrade[],
}

// ═══════════════════════════════════════════════════════════════════════
// 🎯 AURAS & CAPACITÉS SPÉCIALES (Futur)
// ═══════════════════════════════════════════════════════════════════════

export const AURAS_SYSTEM = {
  ENABLED: false, // Désactivé pour l'instant

  // Exemples d'auras (à implémenter)
  AVAILABLE_AURAS: [
    // {
    //   id: 'economy_aura',
    //   name: 'Golden Aura',
    //   description: 'Towers generate +1 gold every 10 seconds',
    //   radius: 5,
    //   cost: 100,
    //   requiredTier: 3,
    // },
  ],
}

export const ABILITIES_SYSTEM = {
  ENABLED: false, // Désactivé pour l'instant

  // Exemples de capacités (à implémenter)
  AVAILABLE_ABILITIES: [
    // {
    //   id: 'nuke',
    //   name: 'Tactical Nuke',
    //   description: 'Destroy all mobs in a large area',
    //   cost: 50,
    //   cooldown: 60, // secondes
    //   requiredTier: 3,
    // },
  ],
}
