/**
 * Performance & Gameplay Constants
 * Centralized magic numbers for game engine optimization
 */

import { TICK_INTERVAL_MS } from './balance.js'

// ========================================
// TICKER ENGINE
// ========================================

/**
 * Number of ticks per second (derived from TICK_INTERVAL_MS)
 */
export const TICKS_PER_SECOND = 1000 / TICK_INTERVAL_MS // 4

/**
 * Ticks between passive income application (12 ticks = 3 seconds at 250ms)
 */
export const INCOME_TICK_INTERVAL = 12

/**
 * Warning threshold for slow ticks (ms)
 * Log warning if tick processing exceeds this duration
 */
export const SLOW_TICK_THRESHOLD_MS = 200

// ========================================
// MOB MOVEMENT & PHYSICS
// ========================================

/**
 * Speed multiplier for mob movement
 * Applied to mob.speed to convert to tiles/tick
 */
export const MOB_SPEED_MULTIPLIER = 0.05

/**
 * Maximum raw speed value for mobs (clamped)
 */
export const MAX_MOB_SPEED = 10

/**
 * Distance threshold to consider waypoint reached (tiles)
 */
export const WAYPOINT_THRESHOLD = 1.5

/**
 * Minimum distance to avoid division by zero in collision (tiles)
 */
export const MIN_SEPARATION_DISTANCE = 0.01

/**
 * Default collision radius for mobs without explicit radius (tiles)
 */
export const DEFAULT_COLLISION_RADIUS = 0.3

/**
 * Force multiplier for mob separation when colliding
 * Higher = stronger push apart effect
 */
export const SEPARATION_FORCE = 0.08

// ========================================
// SPATIAL GRID (Collision Optimization)
// ========================================

/**
 * Spatial grid cell size in tiles
 * Optimizes collision detection from O(n²) to O(n)
 */
export const SPATIAL_GRID_CELL_SIZE = 2

/**
 * Adaptive spatial grid - cell size increases with mob density
 * Formula: Math.ceil(Math.sqrt(mobCount) / GRID_SCALING_FACTOR)
 */
export const SPATIAL_GRID_SCALING_FACTOR = 5

// ========================================
// PROJECTILES & VISUALS
// ========================================

/**
 * Projectile duration as ratio of tick interval
 * 0.8 = projectile lasts 80% of tick duration (200ms for 250ms tick)
 */
export const PROJECTILE_DURATION_RATIO = 0.8

/**
 * Projectile cleanup interval (ms)
 * How often to remove expired projectiles
 */
export const PROJECTILE_CLEANUP_INTERVAL_MS = 50

// ========================================
// FRONTEND RENDERING
// ========================================

/**
 * Canvas interpolation smoothing
 * Provides 60 FPS animation from 4 Hz server updates
 */
export const INTERPOLATION_ENABLED = true

/**
 * Target frames per second for canvas rendering
 */
export const TARGET_FPS = 60

// ========================================
// MONITORING & DEBUGGING
// ========================================

/**
 * Enable performance monitoring logs
 */
export const PERFORMANCE_MONITORING_ENABLED = true

/**
 * Interval for performance stats logging (ticks)
 */
export const PERF_LOG_INTERVAL_TICKS = 40 // Every 10 seconds at 4 Hz

/**
 * Memory leak detection - log if mob count grows unexpectedly
 */
export const MAX_EXPECTED_MOBS_PER_PLAYER = 50

/**
 * Network latency warning threshold (ms)
 */
export const HIGH_LATENCY_THRESHOLD_MS = 500
