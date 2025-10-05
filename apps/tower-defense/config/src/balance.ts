/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║                   BALANCE CONFIGURATION                            ║
 * ║                                                                    ║
 * ║  📊 Fichier UNIQUE pour équilibrer TOUT le jeu                    ║
 * ║  Modifie ici, rebuild, et tout s'adapte automatiquement !         ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════
// 💰 ÉCONOMIE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Gold de départ pour chaque joueur
 */
export const STARTING_GOLD = 15

/**
 * Income passif de base
 * ⚠️ C'est le montant reçu TOUTES LES X secondes (pas par seconde!)
 * Exemple: BASE_INCOME = 1 avec INCOME_INTERVAL_SECONDS = 30
 *          → Tu reçois 1 gold toutes les 30 secondes
 */
export const BASE_INCOME = 1

/**
 * Intervalle d'application de l'income passif (en secondes)
 * À 250ms/tick: 30 secondes = 120 ticks
 */
export const INCOME_INTERVAL_SECONDS = 30

/**
 * Augmentation d'income par tier (futur)
 */
export const INCOME_INCREASE = {
  TIER_2: 1, // +1 income/s au tier 2
  TIER_3: 2, // +2 income/s au tier 3
  ECONOMY_TOWER: 1, // +1 income/s par tour économique (futur)
}

// ═══════════════════════════════════════════════════════════════════════
// 🗼 PRIX DES TOURS
// ═══════════════════════════════════════════════════════════════════════

export const TOWER_PRICING = {
  BASE: 2, // Prix de base
  DAMAGE_MULTIPLIER: 0.5, // Gold par point de dégât (au-dessus de 1)
  RANGE_MULTIPLIER: 0.25, // Gold par point de range (au-dessus de 3)
  SPEED_MULTIPLIER: 0.25, // Gold par point de vitesse (au-dessus de 1)
  SPLASH_BONUS: 1, // +X gold si splash damage
  EFFECT_BONUS: 1, // +X gold si effet spécial
  MIN: 2, // Prix minimum
  MAX: 8, // Prix maximum
}

// ═══════════════════════════════════════════════════════════════════════
// 👹 PRIX DES UNITÉS
// ═══════════════════════════════════════════════════════════════════════

export const UNIT_PRICING = {
  BASE: 1, // Prix de base
  HP_MULTIPLIER: 0.025, // Gold par HP (au-dessus de 10)
  DAMAGE_MULTIPLIER: 0.5, // Gold par point de dégât (au-dessus de 1)
  SPEED_MULTIPLIER: 0.125, // Gold par point de vitesse (au-dessus de 1)
  RANGED_BONUS: 1, // +X gold si ranged
  FLY_BONUS: 1, // +X gold si volant
  MIN: 1, // Prix minimum
  MAX: 6, // Prix maximum
}

// ═══════════════════════════════════════════════════════════════════════
// 💀 RÉCOMPENSES DE KILL
// ═══════════════════════════════════════════════════════════════════════

export const KILL_REWARDS = {
  BASE: 1, // Récompense de base
  HP_MULTIPLIER: 0.025, // Gold par HP (au-dessus de 10)
  DAMAGE_MULTIPLIER: 0.5, // Gold par point de dégât (au-dessus de 1)
  SPEED_MULTIPLIER: 0.125, // Gold par point de vitesse (au-dessus de 1)
  FLY_BONUS: 1, // +X gold si volant
  MIN: 1, // Récompense minimum
  MAX: 5, // Récompense maximum
}

// ═══════════════════════════════════════════════════════════════════════
// 🎮 GAMEPLAY - STATISTIQUES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Statistiques des tours (générées aléatoirement dans ces ranges)
 */
export const TOWER_STATS = {
  DAMAGE_MIN: 1,
  DAMAGE_MAX: 5,
  DAMAGE_MULTIPLIER: 0.5, // Multiplicateur global des dégâts (0.5 = -50% damage)
  RANGE_MIN: 3,
  RANGE_MAX: 10,
  SPEED_MIN: 1, // Attaques par tick (250ms)
  SPEED_MAX: 5,
  SPLASH_RADIUS_MAX: 5,
}

/**
 * Statistiques des mobs (générées aléatoirement dans ces ranges)
 */
export const MOB_STATS = {
  HP_MIN: 10,
  HP_MAX: 100,
  DAMAGE_MIN: 1, // Dégâts infligés au joueur si atteint la fin
  DAMAGE_MAX: 3,
  SPEED_MIN: 1, // Vitesse de déplacement
  SPEED_MAX: 10,
  ATTACK_RANGE_MAX: 10, // Range maximale pour mobs ranged
  COLLISION_RADIUS_MIN: 0.1,
  COLLISION_RADIUS_MAX: 1,
}

/**
 * Statistiques du joueur
 */
export const PLAYER_STATS = {
  STARTING_HP: 100,
  MAX_HP: 100,
}

// ═══════════════════════════════════════════════════════════════════════
// ⚙️ MOTEUR DE JEU
// ═══════════════════════════════════════════════════════════════════════

/**
 * Intervalle du ticker (en millisecondes)
 * 250ms = 4 ticks par seconde
 */
export const TICK_INTERVAL_MS = 250

/**
 * Carte et zone de jeu
 */
export const MAP_CONFIG = {
  TILE_SIZE: 32, // Taille d'une case en pixels
  ZONE_WIDTH: 20, // Largeur de la zone en cases
  ZONE_HEIGHT: 20, // Hauteur de la zone en cases
}

/**
 * Path finding
 */
export const PATHFINDING_CONFIG = {
  START_X: 0, // Début du path (gauche)
  START_Y: 10, // Milieu vertical
  END_X: 19, // Fin du path (droite)
  END_Y: 10, // Milieu vertical
}

// ═══════════════════════════════════════════════════════════════════════
// 🔧 DÉVELOPPEMENT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Activer les logs de debug pour le pricing
 */
export const DEBUG = {
  ENABLE_PRICING_LOGS: false,
  ENABLE_KILL_REWARD_LOGS: true,
  ENABLE_INCOME_LOGS: false,
}
