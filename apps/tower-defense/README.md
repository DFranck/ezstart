# Tower Defense Game

## Overview

Tower Defense is a real-time multiplayer cooperative game built with Next.js (frontend) and Express + Socket.IO (backend). Players collaborate to defend against waves of enemies by strategically placing towers.

## Architecture

This project follows a **monorepo shared architecture** with maximum code reusability:

```
apps/tower-defense/
├── web/                    # Next.js frontend (port 5035)
├── api/                    # Express backend (port 5030)
├── types/                  # Shared TypeScript types (Single Source of Truth)
├── config/                 # Shared gameplay configuration
└── README.md              # This file
```

### Key Principles

- **Single Source of Truth**: Entity definitions (mobs, towers) are defined once in `types/src/entityTypes.ts`
- **Type Safety**: TypeScript ensures frontend and backend use identical types
- **Shared Configuration**: Game constants (speeds, prices, elements) shared via `config` package
- **Real-time Sync**: Socket.IO for instant game state updates

## Quick Start

### Development

```bash
# Start both API and Web (from monorepo root)
pnpm dev:td

# Or individually
pnpm --filter api-tower-defense dev    # API on http://localhost:5030
pnpm --filter web-tower-defense dev    # Web on http://localhost:5035
```

### Build

```bash
pnpm --filter api-tower-defense build
pnpm --filter web-tower-defense build
```

### Production

```bash
# API
cd apps/tower-defense/api
pnpm start

# Web
cd apps/tower-defense/web
pnpm start
```

## Packages

### [@tower-defense/types](./types/README.md)

Shared TypeScript types and Zod schemas. Contains the **Single Source of Truth** for all entity definitions:

- 15 Mob Types (Basic Slime, Armored Knight, Flying Bat, etc.)
- 15 Tower Types (Archer Tower, Sniper Tower, Flame Thrower, etc.)
- Game state types (Game, Player, ActiveMob, TowerWithPosition)
- API schemas (GameAction, CreateGameRequest, JoinGameRequest)

### [@tower-defense/config](./config/README.md)

Shared gameplay configuration constants:

- Elemental Types (normal, fire, water, grass, electric)
- Effects (slow, burn, stun)
- Targeting Strategies (first, last, strongest, closest)
- Price Calculations (tower prices, unit prices, tier unlocks)
- Elemental Colors for UI

## Game Flow

### 1. Create Game

```typescript
POST /api/games
Body: { playerName: string }
Response: { gameId: string, playerId: string }
```

### 2. Join Game

```typescript
POST /api/games/:gameId/join
Body: { playerName: string }
Response: { playerId: string }
```

### 3. Start Game

```typescript
POST /api/games/:gameId/start
Response: { success: boolean }
```

### 4. Game Actions (Socket.IO)

Players send actions via Socket.IO:

```typescript
socket.emit('gameAction', {
  gameId: string,
  playerId: string,
  action: {
    type: 'placeTower' | 'upgradeTower' | 'sellTower' | 'sendMobs',
    payload: { ... }
  }
})
```

### 5. Game State Updates

Backend broadcasts game state every tick (100ms):

```typescript
socket.on('gameStateUpdate', (gameState: Game) => {
  // Update UI with new game state
})
```

## Backend Architecture

### EntityRegistry

In-memory registry for O(1) entity type lookups:

```typescript
import { entityRegistry } from './services/entityRegistry'

// Register types at startup
seedEntityTypes() // Loads ENTITY_MOB_TYPES and ENTITY_TOWER_TYPES

// Use in EntityManager
const mobType = entityRegistry.getMobType('mob-basic-slime')
const towerType = entityRegistry.getTowerType('tower-basic-archer')
```

### GameManager

In-memory game state management with Map-based storage:

```typescript
import { gameManager } from './managers/GameManager'

// Create game
const game = gameManager.createGame(hostId, gameId)

// Add player
gameManager.addPlayer(gameId, player)

// Place tower
gameManager.placeTower(gameId, tower)

// Get game state
const game = gameManager.getGame(gameId)
```

### EntityManager

Factory pattern for creating entities from type IDs:

```typescript
import { entityManager } from './managers/EntityManager'

// Create mob from type
const mob = entityManager.createMob('mob-basic-slime', playerId, path)

// Create tower from type
const tower = entityManager.createTower('tower-basic-archer', playerId, position)
```

### Game Loop

GameEngine runs at 10 TPS (ticks per second):

```typescript
// ECS Systems run every tick
MovementSystem.update(game)      // Move mobs along path
TowerSystem.update(game)         // Towers shoot at mobs
CombatSystem.update(game)        // Apply damage, check deaths
EconomySystem.update(game)       // Grant income, check win/loss
```

## Frontend Architecture

### Game Page

Main game interface at `/[locale]/game`:

- **Canvas**: Renders game world (mobs, towers, projectiles)
- **TowerShop**: Display 3 random towers for current tier (uses real tower types from `@tower-defense/types`)
- **MobShop**: Display 5 random mobs to send (uses real mob types from `@tower-defense/types`)
- **PlayerList**: Shows all players with HP and gold
- **GameControls**: Start game, leave game, settings

### Socket.IO Client

```typescript
import { useSocket } from '@/hooks/useSocket'

const { socket, sendAction } = useSocket(gameId, playerId)

// Send tower placement
sendAction({
  type: 'placeTower',
  payload: { x: 10, y: 5, towerType: selectedTower }
})

// Listen for game updates
socket.on('gameStateUpdate', (game: Game) => {
  setGameState(game)
})
```

### Shop Components

Both shops now use **real entity types** instead of mocks:

```typescript
// TowerShop.tsx
import { ENTITY_TOWER_TYPES } from '@tower-defense/types'

const getAvailableTowersForTier = (tier: number) => {
  return ENTITY_TOWER_TYPES.filter(tower => {
    const price = calculateTowerPrice(tower)
    return isTowerAllowedAtTier(tower, tier, price)
  })
}

// MobShop.tsx
import { ENTITY_MOB_TYPES } from '@tower-defense/types'

const generateMobs = () => {
  const items = []
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * ENTITY_MOB_TYPES.length)
    const mob = ENTITY_MOB_TYPES[randomIndex]!
    items.push({
      type: 'unit',
      basePrice: calculateUnitPrice(mob),
      unit: mob,
    })
  }
  return items
}
```

## Entity Definitions

### 15 Mob Types

| Name | Element | HP | Speed | Special |
|------|---------|----|----|---------|
| Basic Slime | Normal | 30 | 5 | - |
| Armored Knight | Normal | 80 | 3 | High HP |
| Flying Bat | Normal | 20 | 7 | Can fly |
| Fire Imp | Fire | 25 | 6 | Fast |
| Lava Golem | Fire | 100 | 2 | Tank |
| Phoenix | Fire | 50 | 4 | Flying |
| Water Sprite | Water | 25 | 6 | Fast |
| Ice Giant | Water | 90 | 2 | Tank |
| Frost Dragon | Water | 60 | 4 | Flying |
| Vine Walker | Grass | 30 | 5 | - |
| Treant | Grass | 100 | 2 | Tank |
| Poison Bee | Grass | 20 | 7 | Flying |
| Spark Wisp | Electric | 25 | 6 | Fast |
| Thunder Titan | Electric | 90 | 2 | Tank |
| Lightning Hawk | Electric | 50 | 4 | Flying |

### 15 Tower Types

| Name | Element | Damage | Range | Special |
|------|---------|--------|-------|---------|
| Archer Tower | Normal | 2 | 5 | Single target |
| Sniper Tower | Normal | 5 | 8 | Long range |
| Cannon Tower | Normal | 10 | 4 | Slow attack |
| Flame Thrower | Fire | 3 | 4 | AoE burn |
| Inferno Tower | Fire | 6 | 5 | Single burn |
| Phoenix Nest | Fire | 4 | 6 | Flying priority |
| Ice Shard | Water | 2 | 5 | Slow effect |
| Blizzard Tower | Water | 4 | 4 | AoE slow |
| Tidal Wave | Water | 3 | 6 | Strong slow |
| Vine Snare | Grass | 2 | 5 | Slow effect |
| Nature Guardian | Grass | 3 | 4 | AoE slow |
| Overgrowth | Grass | 4 | 6 | Strong slow |
| Tesla Coil | Electric | 3 | 5 | Stun effect |
| Lightning Storm | Electric | 5 | 4 | AoE stun |
| Thunderforge | Electric | 4 | 6 | Strong stun |

## Environment Variables

### API (.env.local)

```env
PORT=5030
MONGO_URL=mongodb://localhost:27017/ezstart
```

### Web (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5030/api
```

## Testing

### Load Testing

Test maximum capacity (towers, mobs, players):

```bash
cd apps/tower-defense/api
pnpm test:load
```

## Deployment

### API

Deployed on Railway:
- URL: https://tower-defense-api.up.railway.app
- Health: `/api/health`

### Web

Deployed on Vercel:
- URL: https://tower-defense-web.vercel.app

## Technologies

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Express, Socket.IO, TypeScript
- **Database**: MongoDB with Mongoose
- **Validation**: Zod schemas
- **UI Components**: Radix UI (from `@ezstart/ui`)
- **Real-time**: Socket.IO for game state sync

## Related Packages

- [@ezstart/ui](../../packages/ui/README.md) - Shared UI components
- [@ezstart/express-core](../../packages/express-core/README.md) - Express infrastructure
- [@ezstart/auth-sdk](../../packages/auth-sdk/README.md) - Authentication (future integration)

## Future Improvements

- [ ] EZAuth integration for persistent user accounts
- [ ] EZPay integration for in-app purchases (gems, powerups)
- [ ] Leaderboards and player stats
- [ ] Tower upgrade system
- [ ] Wave-based mob spawning
- [ ] Multiple maps and paths
- [ ] Spectator mode
- [ ] Replay system

## Troubleshooting

### Game Not Found Error

If you get "Game not found" when starting:
1. Make sure you created the game AFTER the latest code changes
2. Old games created before gameId sync fix won't work
3. Leave game and create a new one

### Tower Placement Fails

If towers can't be placed:
1. Check EntityRegistry is seeded: Should see "✅ Seeded 15 mob types and 15 tower types" in API logs
2. Verify frontend uses real tower types (not mocks)
3. Check tower type ID matches registry (e.g., "tower-basic-archer")

### Port Already in Use

If you get EADDRINUSE errors:
1. Kill all Node.js processes: `taskkill /F /IM node.exe` (Windows) or `killall node` (Mac/Linux)
2. Or restart VS Code to clean up background processes
3. Check no other dev server is running on ports 5030 or 5035

### Old API Version Running

If API still has old entity types (3 instead of 15):
1. Kill all Node.js processes
2. Run `pnpm --filter api-tower-defense build` to rebuild
3. Restart dev server with `pnpm dev:td`

## Contributing

When adding new entities or game mechanics:

1. **Update types first**: Add to `types/src/entityTypes.ts`
2. **Update config if needed**: Add constants to `config/src/`
3. **Rebuild packages**: `pnpm --filter @tower-defense/types build`
4. **Test frontend and backend**: Verify both use new types
5. **Update documentation**: README, CLAUDE.md, inline comments

## License

MIT
