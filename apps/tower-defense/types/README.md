# @tower-defense/types

## Overview

Shared TypeScript types and Zod schemas for Tower Defense game. This package serves as the **Single Source of Truth** for all entity definitions (mobs and towers), game state types, and API contracts.

## Installation

```bash
# In package.json
"dependencies": {
  "@tower-defense/types": "workspace:*"
}
```

## Key Concepts

### Single Source of Truth

All entity definitions (mobs and towers) are defined **once** in `entityTypes.ts` and imported by both frontend and backend:

- **Backend**: EntityRegistry seeds from these definitions
- **Frontend**: TowerShop and MobShop display these definitions

This ensures:
- ✅ No data mismatch between frontend and backend
- ✅ Type safety across the entire stack
- ✅ One place to add/modify entities
- ✅ Build-time validation instead of runtime errors

## Usage

### Import Entity Definitions

```typescript
// Import all 15 mob types
import { ENTITY_MOB_TYPES } from '@tower-defense/types'

// Import all 15 tower types
import { ENTITY_TOWER_TYPES } from '@tower-defense/types'

// Use in backend EntityRegistry
ENTITY_MOB_TYPES.forEach(mobType => {
  entityRegistry.registerMobType(mobType)
})

// Use in frontend TowerShop
const tower = ENTITY_TOWER_TYPES[0] // Archer Tower
<TowerCard tower={tower} />
```

### Import Game Types

```typescript
import type {
  Game,
  Player,
  ActiveMob,
  TowerWithPosition,
  MobType,
  TowerType,
  ElementalType
} from '@tower-defense/types'

// Use in game state
const game: Game = {
  _id: '123',
  hostId: 'player1',
  players: [player1, player2],
  phase: 'playing',
  // ...
}
```

### Import API Schemas

```typescript
import {
  createGameRequestSchema,
  joinGameRequestSchema,
  gameActionSchema
} from '@tower-defense/types'

// Validate API requests with Zod
const body = createGameRequestSchema.parse(req.body)
```

## Entity Definitions

### 15 Mob Types (ENTITY_MOB_TYPES)

Defined in `src/entityTypes.ts`:

#### Normal Element (3 mobs)
- **Basic Slime**: 30 HP, speed 5, ground
- **Armored Knight**: 80 HP, speed 3, ground (tank)
- **Flying Bat**: 20 HP, speed 7, flying

#### Fire Element (3 mobs)
- **Fire Imp**: 25 HP, speed 6, ground
- **Lava Golem**: 100 HP, speed 2, ground (tank)
- **Phoenix**: 50 HP, speed 4, flying

#### Water Element (3 mobs)
- **Water Sprite**: 25 HP, speed 6, ground
- **Ice Giant**: 90 HP, speed 2, ground (tank)
- **Frost Dragon**: 60 HP, speed 4, flying

#### Grass Element (3 mobs)
- **Vine Walker**: 30 HP, speed 5, ground
- **Treant**: 100 HP, speed 2, ground (tank)
- **Poison Bee**: 20 HP, speed 7, flying

#### Electric Element (3 mobs)
- **Spark Wisp**: 25 HP, speed 6, ground
- **Thunder Titan**: 90 HP, speed 2, ground (tank)
- **Lightning Hawk**: 50 HP, speed 4, flying

### 15 Tower Types (ENTITY_TOWER_TYPES)

Defined in `src/entityTypes.ts`:

#### Normal Element (3 towers)
- **Archer Tower**: 2 damage, range 5, single target
- **Sniper Tower**: 5 damage, range 8, single target (long range)
- **Cannon Tower**: 10 damage, range 4, single target (slow)

#### Fire Element (3 towers)
- **Flame Thrower**: 3 damage, range 4, AoE burn
- **Inferno Tower**: 6 damage, range 5, single burn
- **Phoenix Nest**: 4 damage, range 6, flying priority

#### Water Element (3 towers)
- **Ice Shard**: 2 damage, range 5, slow effect
- **Blizzard Tower**: 4 damage, range 4, AoE slow
- **Tidal Wave**: 3 damage, range 6, strong slow

#### Grass Element (3 towers)
- **Vine Snare**: 2 damage, range 5, slow effect
- **Nature Guardian**: 3 damage, range 4, AoE slow
- **Overgrowth**: 4 damage, range 6, strong slow

#### Electric Element (3 towers)
- **Tesla Coil**: 3 damage, range 5, stun effect
- **Lightning Storm**: 5 damage, range 4, AoE stun
- **Thunderforge**: 4 damage, range 6, strong stun

## Type Definitions

### MobType

```typescript
export type MobType = {
  _id: string                    // e.g., 'mob-basic-slime'
  name: string                   // Display name
  elementalType: ElementalType   // 'normal' | 'fire' | 'water' | 'grass' | 'electric'
  hp: number                     // Health points
  speed: number                  // Movement speed
  damage: number                 // Damage dealt to players
  canFly: boolean                // Can fly over obstacles
  attackRange: number            // Attack range (usually 0 for mobs)
  collisionRadius: number        // Collision detection radius
  effects?: Effect[]             // Status effects (slow, burn, stun)
}
```

### TowerType

```typescript
export type TowerType = {
  _id: string                    // e.g., 'tower-basic-archer'
  name: string                   // Display name
  elementalType: ElementalType   // 'normal' | 'fire' | 'water' | 'grass' | 'electric'
  damage: number                 // Damage per shot
  damageType: DamageType         // 'single' | 'aoe'
  speed: number                  // Attack speed (attacks per second)
  range: number                  // Attack range
  shape: boolean[][]             // Tower footprint (2D grid)
  targetingStrategy: TargetingStrategy  // 'first' | 'last' | 'strongest' | 'closest'
  effects?: Effect[]             // Status effects applied
  description?: string           // Description for UI
}
```

### Game State Types

```typescript
// Main game state
export type Game = {
  _id: string
  hostId: string
  players: Player[]
  phase: 'waiting' | 'playing' | 'finished'
  winner?: 'players' | 'mobs'
  createdAt: Date
  startedAt?: Date
  finishedAt?: Date
}

// Player in game
export type Player = {
  _id: string
  name: string
  hp: number
  gold: number
  income: number
  tier: number
  goldSpent: number
  isAlive: boolean
}

// Active mob instance
export type ActiveMob = {
  id: string                     // Unique instance ID
  typeId: string                 // Reference to MobType._id
  playerId: string               // Owner player
  currentHp: number
  position: { x: number; y: number }
  pathIndex: number
  speed: number
  effects: ActiveEffect[]
}

// Tower instance with position
export type TowerWithPosition = {
  id: string                     // Unique instance ID
  typeId: string                 // Reference to TowerType._id
  playerId: string               // Owner player
  position: { x: number; y: number }
  level: number
  kills: number
  damageDealt: number
}
```

### API Request/Response Types

```typescript
// Create game request
export type CreateGameRequest = {
  playerName: string
}

// Join game request
export type JoinGameRequest = {
  playerName: string
}

// Game action (Socket.IO)
export type GameAction = {
  type: 'placeTower' | 'upgradeTower' | 'sellTower' | 'sendMobs'
  payload: {
    // Varies by action type
    x?: number
    y?: number
    towerId?: string
    towerType?: TowerType
    mobType?: MobType
    // ...
  }
}
```

## Zod Schemas

All types have corresponding Zod schemas for runtime validation:

```typescript
import {
  mobTypeSchema,
  towerTypeSchema,
  createGameRequestSchema,
  joinGameRequestSchema,
  gameActionSchema
} from '@tower-defense/types'

// Validate in API endpoint
const body = createGameRequestSchema.parse(req.body)
```

## Architecture

### Dependency Graph

```
@tower-defense/types
    ↓
@tower-defense/config  (elemental types, effects, targeting)
```

**Important**: `types` imports from `config`, but `config` does NOT import from `types`. This prevents circular dependencies.

### Why This Package Exists

**Before (Problems):**
- Frontend generated random mock towers ("harum", "conventus")
- Backend EntityRegistry had different towers ("tower-basic-archer")
- Tower placement failed: "TowerType harum not found in registry"
- No type safety between frontend and backend

**After (Solution):**
- Single source of truth in `entityTypes.ts`
- Both frontend and backend import same definitions
- Type errors caught at compile-time
- No data mismatch possible

## Development Workflow

### Adding a New Entity

1. **Add to entityTypes.ts**

```typescript
export const ENTITY_TOWER_TYPES: TowerType[] = [
  // ... existing towers
  {
    _id: 'tower-ice-wizard',
    name: 'Ice Wizard',
    elementalType: 'water',
    damage: 8,
    damageType: 'single',
    speed: 0.5,
    range: 7,
    shape: [[true]],
    targetingStrategy: 'strongest',
    effects: ['slow'],
    description: 'Powerful single-target slow',
  },
]
```

2. **Rebuild package**

```bash
pnpm --filter @tower-defense/types build
```

3. **Restart dev servers**

Backend EntityRegistry will automatically seed the new tower. Frontend TowerShop will automatically display it.

### Modifying Entity Properties

1. Update in `entityTypes.ts`
2. Rebuild package
3. TypeScript will show errors if properties are invalid
4. Fix any type errors in API or Web
5. Restart dev servers

## Testing

### Verify Entity Counts

```bash
# Start Tower Defense API
pnpm --filter api-tower-defense dev

# Check logs for:
# ✅ Seeded 15 mob types and 15 tower types
```

### Verify Type Safety

```bash
# Run TypeCheck across all packages
pnpm typecheck

# Should show 0 errors if all types are valid
```

## Troubleshooting

### "TowerType [id] not found in registry"

**Cause**: Frontend using mock data instead of real types

**Fix**: Ensure frontend imports from `@tower-defense/types`:
```typescript
import { ENTITY_TOWER_TYPES } from '@tower-defense/types'
```

### "Type X is not assignable to type Y"

**Cause**: Entity definition uses invalid enum value

**Fix**: Check valid values in `@tower-defense/config`:
- Effects: `'slow' | 'burn' | 'stun'`
- Targeting: `'first' | 'last' | 'strongest' | 'closest'`
- Elements: `'normal' | 'fire' | 'water' | 'grass' | 'electric'`

### Circular Dependency Error

**Cause**: Importing from wrong package

**Fix**: Always import from `types`, never the other way:
```typescript
// ✅ Correct
import { ENTITY_TOWER_TYPES } from '@tower-defense/types'

// ❌ Wrong (causes cycle)
import { ENTITY_TOWER_TYPES } from '@tower-defense/config'
```

## Related Packages

- [@tower-defense/config](../config/README.md) - Gameplay configuration constants
- [@tower-defense/api](../api/README.md) - Backend EntityRegistry usage
- [@tower-defense/web](../web/README.md) - Frontend TowerShop/MobShop usage

## Contributing

When modifying entity definitions:

1. ✅ Ensure TypeScript types are valid
2. ✅ Use valid enum values from config
3. ✅ Rebuild package after changes
4. ✅ Test in both API and Web
5. ✅ Update documentation if adding new entity types

## License

MIT
