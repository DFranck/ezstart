# @tower-defense/config

## Overview

Shared gameplay configuration constants for Tower Defense game. This package provides all game-related constants, formulas, and enums used by both frontend and backend.

## Installation

```bash
# In package.json
"dependencies": {
  "@tower-defense/config": "workspace:*"
}
```

## Key Features

- **Elemental Types**: Fire, Water, Grass, Electric, Normal
- **Effects**: Slow, Burn, Stun
- **Targeting Strategies**: First, Last, Strongest, Closest
- **Price Calculations**: Tower pricing, unit pricing, tier unlocks
- **UI Colors**: Elemental color schemes for display
- **Game Constants**: Default HP, gold, income, speeds

## Usage

### Import Constants

```typescript
// Import elemental types
import { ELEMENTAL_TYPES, ELEMENTAL_COLORS } from '@tower-defense/config'

// Import effects and labels
import { EFFECTS, EFFECT_LABELS } from '@tower-defense/config'

// Import targeting strategies
import { TARGETING_STRATEGIES, TARGETING_LABELS } from '@tower-defense/config'

// Import pricing functions
import {
  calculateTowerPrice,
  calculateUnitPrice,
  isTowerAllowedAtTier
} from '@tower-defense/config'

// Import game constants
import { DEFAULT_HP, DEFAULT_GOLD, DEFAULT_INCOME } from '@tower-defense/config'
```

### Example: Calculate Tower Price

```typescript
import { calculateTowerPrice } from '@tower-defense/config'
import type { TowerType } from '@tower-defense/types'

const tower: TowerType = {
  _id: 'tower-basic-archer',
  name: 'Archer Tower',
  elementalType: 'normal',
  damage: 2,
  range: 5,
  // ...
}

const price = calculateTowerPrice(tower)
// price = 5 (base price for normal element + damage/range formula)
```

### Example: Display Elemental Colors

```typescript
import { ELEMENTAL_COLORS } from '@tower-defense/config'

// Use in UI components
<div className={ELEMENTAL_COLORS.fire}>
  Fire Tower
</div>
// Result: text-red-500 class applied
```

## Configuration Files

### elements.ts

Defines elemental types and their UI colors:

```typescript
export const ELEMENTAL_TYPES = ['normal', 'fire', 'water', 'grass', 'electric'] as const

export const ELEMENTAL_COLORS = {
  normal: 'text-gray-500',
  fire: 'text-red-500',
  water: 'text-blue-500',
  grass: 'text-green-500',
  electric: 'text-yellow-500',
} as const
```

### effects.ts

Defines status effects:

```typescript
export const EFFECTS = ['slow', 'burn', 'stun'] as const

export const EFFECT_LABELS = {
  slow: '❄️ Slow',
  burn: '🔥 Burn',
  stun: '⚡ Stun',
} as const
```

### targeting.ts

Defines targeting strategies for towers:

```typescript
export const TARGETING_STRATEGIES = [
  'first',
  'last',
  'strongest',
  'closest',
] as const

export const TARGETING_LABELS = {
  first: '🎯 First',
  last: '🔚 Last',
  strongest: '💪 Strongest',
  closest: '📍 Closest',
} as const
```

### gameplay.ts

Game constants and formulas:

```typescript
// Player defaults
export const DEFAULT_HP = 20
export const DEFAULT_GOLD = 100
export const DEFAULT_INCOME = 10

// Pricing
export function calculateTowerPrice(tower: TowerType): number {
  const basePrices = {
    normal: 5,
    fire: 8,
    water: 7,
    grass: 6,
    electric: 9,
  }

  const basePrice = basePrices[tower.elementalType]
  const damageMultiplier = tower.damage * 2
  const rangeBonus = tower.range

  return Math.round(basePrice + damageMultiplier + rangeBonus)
}

export function calculateUnitPrice(mob: MobType): number {
  const basePrices = {
    normal: 2,
    fire: 3,
    water: 3,
    grass: 2,
    electric: 4,
  }

  const basePrice = basePrices[mob.elementalType]
  const hpMultiplier = mob.hp * 0.1
  const speedBonus = mob.speed * 0.5

  return Math.round(basePrice + hpMultiplier + speedBonus)
}

export function isTowerAllowedAtTier(
  tower: TowerType,
  currentTier: number,
  towerPrice: number
): boolean {
  // Tier 1: towers ≤ 15 gold
  // Tier 2: towers ≤ 30 gold
  // Tier 3: all towers
  const maxPriceForTier = currentTier * 15
  return towerPrice <= maxPriceForTier
}
```

## Elemental System

### 5 Elements

| Element | Color | Base Cost (Tower) | Base Cost (Mob) |
|---------|-------|-------------------|-----------------|
| Normal | Gray | 5 | 2 |
| Fire | Red | 8 | 3 |
| Water | Blue | 7 | 3 |
| Grass | Green | 6 | 2 |
| Electric | Yellow | 9 | 4 |

### Element Characteristics

- **Normal**: Balanced stats, good for beginners
- **Fire**: High damage, burns enemies over time
- **Water**: Slows enemies, good for crowd control
- **Grass**: Poison effects, tanky units
- **Electric**: Stun effects, fastest attacks

## Status Effects

### Slow ❄️

- Reduces movement speed by 50%
- Duration: 3 seconds
- Applied by: Water and Grass towers
- Stacks: No (refreshes duration)

### Burn 🔥

- Deals 2 damage per second
- Duration: 5 seconds
- Applied by: Fire towers
- Stacks: Yes (damage increases)

### Stun ⚡

- Prevents movement and attacks
- Duration: 1 second
- Applied by: Electric towers
- Stacks: No (refreshes duration)

## Targeting Strategies

### First 🎯

Targets the mob closest to the end goal. Best for preventing leaks.

```typescript
targetingStrategy: 'first'
```

### Last 🔚

Targets the mob furthest from the end goal. Good for weakening the back line.

```typescript
targetingStrategy: 'last'
```

### Strongest 💪

Targets the mob with the highest current HP. Best for taking down tanks.

```typescript
targetingStrategy: 'strongest'
```

### Closest 📍

Targets the mob closest to the tower. Best for area denial.

```typescript
targetingStrategy: 'closest'
```

## Price Calculations

### Tower Pricing Formula

```
price = basePrice[element] + (damage × 2) + range
```

**Example:**
```typescript
// Archer Tower (Normal, 2 damage, 5 range)
price = 5 + (2 × 2) + 5 = 14 gold
```

### Mob Pricing Formula

```
price = basePrice[element] + (hp × 0.1) + (speed × 0.5)
```

**Example:**
```typescript
// Basic Slime (Normal, 30 HP, 5 speed)
price = 2 + (30 × 0.1) + (5 × 0.5) = 7.5 → 8 gold (rounded)
```

### Tier Unlocks

Players unlock more powerful towers as they level up:

```typescript
Tier 1: Towers ≤ 15 gold
Tier 2: Towers ≤ 30 gold
Tier 3: All towers
```

## Game Constants

### Player Defaults

```typescript
DEFAULT_HP = 20        // Starting health
DEFAULT_GOLD = 100     // Starting gold
DEFAULT_INCOME = 10    // Gold per wave/interval
```

### Game Speed

```typescript
TICK_RATE = 10         // Ticks per second (100ms per tick)
MOVE_SPEED = 1         // Grid units per second
ATTACK_SPEED = 1       // Attacks per second
```

## Architecture

### Dependency Graph

```
@tower-defense/config  (no dependencies)
    ↑
@tower-defense/types  (imports from config)
```

**Important**: Config is a leaf package with NO dependencies on other Tower Defense packages. This prevents circular dependencies.

### Why This Package Exists

**Benefits:**
- ✅ **Single source of truth** for all gameplay constants
- ✅ **Easy balancing**: Change one value, affects entire game
- ✅ **Type safety**: TypeScript enums for elements, effects, targeting
- ✅ **Consistent UI**: Shared color schemes
- ✅ **Backend validation**: Same pricing logic on client and server

**Example Use Case:**
If you want to rebalance fire towers to cost more:
1. Change `fire: 8` to `fire: 10` in `gameplay.ts`
2. Rebuild package
3. All fire towers now cost 2 more gold (frontend and backend)

## Development Workflow

### Adding a New Element

1. **Add to elements.ts**

```typescript
export const ELEMENTAL_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric',
  'shadow'  // New element
] as const

export const ELEMENTAL_COLORS = {
  // ... existing
  shadow: 'text-purple-500',
}
```

2. **Update gameplay.ts pricing**

```typescript
const basePrices = {
  // ... existing
  shadow: 12,
}
```

3. **Rebuild and restart**

```bash
pnpm --filter @tower-defense/config build
pnpm dev:td  # Restart dev servers
```

### Adding a New Effect

1. **Add to effects.ts**

```typescript
export const EFFECTS = ['slow', 'burn', 'stun', 'poison'] as const

export const EFFECT_LABELS = {
  // ... existing
  poison: '☠️ Poison',
}
```

2. **Implement effect logic** in backend systems (e.g., CombatSystem)

3. **Rebuild and test**

### Changing Pricing Balance

1. **Modify formulas** in `gameplay.ts`
2. **Test in-game** with different towers/mobs
3. **Iterate** until balanced

## Testing

### Verify Constants Export

```bash
# Run TypeCheck
pnpm --filter @tower-defense/config typecheck

# Should show 0 errors
```

### Test Pricing Calculations

```typescript
// In API or Web, test with real data
import { calculateTowerPrice, ELEMENTAL_TYPES } from '@tower-defense/config'
import { ENTITY_TOWER_TYPES } from '@tower-defense/types'

ENTITY_TOWER_TYPES.forEach(tower => {
  const price = calculateTowerPrice(tower)
  console.log(`${tower.name}: ${price} gold`)
})
```

## Troubleshooting

### "Cannot find module @tower-defense/config"

**Cause**: Package not built or not installed

**Fix**:
```bash
pnpm install
pnpm --filter @tower-defense/config build
```

### Type errors with enum values

**Cause**: Using invalid enum value not defined in config

**Fix**: Check valid values in config files:
```typescript
// Only these are valid
type ElementalType = 'normal' | 'fire' | 'water' | 'grass' | 'electric'
type Effect = 'slow' | 'burn' | 'stun'
type TargetingStrategy = 'first' | 'last' | 'strongest' | 'closest'
```

### Circular dependency with types package

**Cause**: Config importing from types (not allowed)

**Fix**: Config should NEVER import from types. Only types imports from config.
```typescript
// ❌ Wrong (in config)
import type { TowerType } from '@tower-defense/types'

// ✅ Correct (in types)
import { ELEMENTAL_TYPES } from '@tower-defense/config'
```

## Related Packages

- [@tower-defense/types](../types/README.md) - Uses config for type definitions
- [@tower-defense/api](../api/README.md) - Uses config for game logic
- [@tower-defense/web](../web/README.md) - Uses config for UI display

## Contributing

When modifying configuration:

1. ✅ Keep config as a leaf package (no dependencies on types)
2. ✅ Update pricing formulas carefully (test balance)
3. ✅ Add new constants instead of removing old ones
4. ✅ Document changes in CLAUDE.md
5. ✅ Rebuild package after changes

## License

MIT
