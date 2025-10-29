# 🚀 Tower Defense - Performance Optimization Implementation Plan

**Status:** Ready to implement
**Est. Time:** 4-6 days full implementation
**Impact:** 98% bandwidth reduction, 58 FPS target

---

## 📋 TLDR - What's Changing

### Before:
```typescript
interface ActiveMob {
  id: string
  mob: Mob  // 🔴 Full 200-byte object duplicated 400×
}

// Game state: 154KB sent every 250ms = 616KB/sec per player
```

### After:
```typescript
interface ActiveMob {
  id: string
  mobTypeId: string  // ✅ 36-byte reference
}

// Game state: 2KB deltas every 250ms = 8KB/sec per player (98% reduction)
```

---

## ⚠️ BREAKING CHANGES SUMMARY

**Types Changed:**
- `ActiveMob`: `.mob` → `.mobTypeId`
- `PlacedTower`: extends `Tower` → `.towerTypeId` + `.id`

**Files Impacted:** ~30+ files
- API: tickerEngine, spawnMob, placeTower, gameActions
- Web: MultiPlayerCanvas, rendering, shops
- Utils: paintFromElement, computeCoveredCells

**Database:** No migration needed (backward compatible)

---

## 📅 IMPLEMENTATION PHASES

### Phase 1: Type Refactoring (Day 1-2) ✅ TYPES CREATED

**Status:** Types defined, need registry system

**What's Done:**
- ✅ Created `MobType` and `TowerType` schemas
- ✅ Updated `ActiveMob` to use `mobTypeId`
- ✅ Updated `PlacedTower` to use `towerTypeId`
- ✅ Added legacy schemas for backward compat

**What's Next:**
1. Create MobType/TowerType registries (in-memory Maps)
2. Update Game schema to include `mobTypes` and `towerTypes` arrays
3. Seed initial mob/tower types from config

---

### Phase 2: API Migration (Day 2-3)

#### Step 2.1: Create Registry System

**File:** `apps/tower-defense/api/src/services/entityRegistry.ts`

```typescript
import { MobType, TowerType } from '@tower-defense/types'

class EntityRegistry {
  private mobTypes = new Map<string, MobType>()
  private towerTypes = new Map<string, TowerType>()

  // Mob registry
  registerMobType(mobType: MobType) {
    this.mobTypes.set(mobType._id, mobType)
  }

  getMobType(id: string): MobType | undefined {
    return this.mobTypes.get(id)
  }

  getAllMobTypes(): MobType[] {
    return Array.from(this.mobTypes.values())
  }

  // Tower registry
  registerTowerType(towerType: TowerType) {
    this.towerTypes.set(towerType._id, towerType)
  }

  getTowerType(id: string): TowerType | undefined {
    return this.towerTypes.get(id)
  }

  getAllTowerTypes(): TowerType[] {
    return Array.from(this.towerTypes.values())
  }
}

export const entityRegistry = new EntityRegistry()

// Seed with initial types
export function seedEntityTypes() {
  // Load from DB or config
  const initialMobs = mockMobTypes(10)
  const initialTowers = mockTowerTypes(20)

  initialMobs.forEach(mob => entityRegistry.registerMobType(mob))
  initialTowers.forEach(tower => entityRegistry.registerTowerType(tower))
}
```

#### Step 2.2: Update spawnMob Service

**File:** `apps/tower-defense/api/src/services/spawnMob.ts`

```typescript
// BEFORE
export function spawnMob(state: GameTickerState, mobType: Mob, ...): ActiveMob {
  return {
    id: new ObjectId().toString(),
    mob: mobType,  // 🔴 Embedding full object
    currentHp: mobType.hp,
    // ...
  }
}

// AFTER
import { entityRegistry } from './entityRegistry.js'

export function spawnMob(state: GameTickerState, mobTypeId: string, ...): ActiveMob {
  const mobType = entityRegistry.getMobType(mobTypeId)
  if (!mobType) throw new Error(`MobType ${mobTypeId} not found`)

  return {
    id: new ObjectId().toString(),
    mobTypeId,  // ✅ Reference only
    currentHp: mobType.hp,
    // ...
  }
}
```

#### Step 2.3: Update placeTower Service

**File:** `apps/tower-defense/api/src/services/placeTower.ts`

```typescript
// BEFORE
export function placeTower(towerType: Tower, origin: Position): PlacedTower {
  return {
    ...towerType,  // 🔴 Spreading all properties
    origin,
    coveredCells: computeCoveredCells(origin, towerType.shape),
  }
}

// AFTER
import { entityRegistry } from './entityRegistry.js'

export function placeTower(towerTypeId: string, origin: Position): PlacedTower {
  const towerType = entityRegistry.getTowerType(towerTypeId)
  if (!towerType) throw new Error(`TowerType ${towerTypeId} not found`)

  return {
    id: new ObjectId().toString(),
    towerTypeId,  // ✅ Reference only
    origin,
    coveredCells: computeCoveredCells(origin, towerType.shape),
  }
}
```

#### Step 2.4: Update tickerEngine

**File:** `apps/tower-defense/api/src/services/tickerEngine.ts`

```typescript
// BEFORE
activeMobs.forEach(mob => {
  const speed = mob.mob.speed  // 🔴 Accessing nested property
  // ...
})

// AFTER
import { entityRegistry } from './entityRegistry.js'

activeMobs.forEach(mob => {
  const mobType = entityRegistry.getMobType(mob.mobTypeId)!
  const speed = mobType.speed  // ✅ Lookup once
  // ...
})
```

**Optimization:** Cache lookups at start of tick

```typescript
// Create lookup map once per tick
const mobTypesCache = new Map(
  activeMobs.map(m => [m.id, entityRegistry.getMobType(m.mobTypeId)!])
)

activeMobs.forEach(mob => {
  const mobType = mobTypesCache.get(mob.id)!  // O(1) lookup
  // ...
})
```

---

### Phase 3: Client Migration (Day 3-4)

#### Step 3.1: Create Client-Side Registry

**File:** `apps/tower-defense/web/src/stores/useEntityRegistry.ts`

```typescript
import { create } from 'zustand'
import { MobType, TowerType } from '@tower-defense/types'

interface EntityRegistryState {
  mobTypes: Map<string, MobType>
  towerTypes: Map<string, TowerType>

  // Actions
  setMobTypes: (types: MobType[]) => void
  setTowerTypes: (types: TowerType[]) => void
  getMobType: (id: string) => MobType | undefined
  getTowerType: (id: string) => TowerType | undefined
}

export const useEntityRegistry = create<EntityRegistryState>((set, get) => ({
  mobTypes: new Map(),
  towerTypes: new Map(),

  setMobTypes: (types) => set({ mobTypes: new Map(types.map(t => [t._id, t])) }),
  setTowerTypes: (types) => set({ towerTypes: new Map(types.map(t => [t._id, t])) }),

  getMobType: (id) => get().mobTypes.get(id),
  getTowerType: (id) => get().towerTypes.get(id),
}))
```

#### Step 3.2: Load Types on Game Init

**File:** `apps/tower-defense/web/src/contexts/GameContext.tsx`

```typescript
// On game join
useEffect(() => {
  socket.on('initialState', (data: { mobTypes, towerTypes, game }) => {
    // Load entity types ONCE
    useEntityRegistry.getState().setMobTypes(data.mobTypes)
    useEntityRegistry.getState().setTowerTypes(data.towerTypes)

    // Then load game state
    setGame(data.game)
  })
}, [socket])
```

#### Step 3.3: Update MultiPlayerCanvas

**File:** `apps/tower-defense/web/src/app/[locale]/game/components/MultiPlayerCanvas.tsx`

```typescript
// BEFORE
interpolatedMobsRef.current.forEach(mob => {
  const mobColor = ELEMENTAL_COLORS[mob.mob.elementalType]  // 🔴 nested
  // ...
})

// AFTER
import { useEntityRegistry } from '@/stores/useEntityRegistry'

const getMobType = useEntityRegistry(s => s.getMobType)

interpolatedMobsRef.current.forEach(mob => {
  const mobType = getMobType(mob.mobTypeId)!
  const mobColor = ELEMENTAL_COLORS[mobType.elementalType]  // ✅ lookup
  // ...
})
```

**Optimization:** Cache lookups in useMemo

```typescript
const mobTypesCache = useMemo(() => {
  const cache = new Map<string, MobType>()
  interpolatedMobsRef.current.forEach(mob => {
    const type = getMobType(mob.mobTypeId)
    if (type) cache.set(mob.id, type)
  })
  return cache
}, [interpolatedMobsRef.current, getMobType])

// Then use cache
interpolatedMobsRef.current.forEach(mob => {
  const mobType = mobTypesCache.get(mob.id)!
  // ...
})
```

---

### Phase 4: Spatial Indexing (Day 4-5)

#### Step 4.1: Create SpatialGrid Class

**File:** `apps/tower-defense/api/src/services/spatialGrid.ts`

```typescript
import { ActiveMob, Position } from '@tower-defense/types'

export class SpatialGrid<T extends { position: Position }> {
  private grid: Map<string, T[]> = new Map()
  private cellSize: number

  constructor(cellSize: number = 5) {
    this.cellSize = cellSize
  }

  clear() {
    this.grid.clear()
  }

  insert(entity: T) {
    const key = this.getKey(entity.position)
    if (!this.grid.has(key)) {
      this.grid.set(key, [])
    }
    this.grid.get(key)!.push(entity)
  }

  getNearby(position: Position, range: number): T[] {
    const cells = this.getNearbyCells(position, range)
    const entities: T[] = []

    for (const key of cells) {
      const cellEntities = this.grid.get(key)
      if (cellEntities) {
        entities.push(...cellEntities)
      }
    }

    return entities
  }

  private getKey(pos: Position): string {
    const x = Math.floor(pos.x / this.cellSize)
    const y = Math.floor(pos.y / this.cellSize)
    return `${x},${y}`
  }

  private getNearbyCells(pos: Position, range: number): string[] {
    const cells: string[] = []
    const cellRange = Math.ceil(range / this.cellSize)

    const centerX = Math.floor(pos.x / this.cellSize)
    const centerY = Math.floor(pos.y / this.cellSize)

    for (let x = centerX - cellRange; x <= centerX + cellRange; x++) {
      for (let y = centerY - cellRange; y <= centerY + cellRange; y++) {
        cells.push(`${x},${y}`)
      }
    }

    return cells
  }
}
```

#### Step 4.2: Use SpatialGrid in Ticker

**File:** `apps/tower-defense/api/src/services/tickerEngine.ts`

```typescript
import { SpatialGrid } from './spatialGrid.js'

export function tick(state: GameTickerState) {
  // Build spatial grid ONCE per tick
  const mobGrid = new SpatialGrid<ActiveMob>(5)
  state.activeMobs.forEach(mob => mobGrid.insert(mob))

  // Tower targeting - now O(k) instead of O(n)
  state.players.forEach(player => {
    player.placedTowers.forEach(tower => {
      const towerType = entityRegistry.getTowerType(tower.towerTypeId)!

      // Get only nearby mobs (typically 5-10 instead of 400)
      const nearbyMobs = mobGrid.getNearby(tower.origin, towerType.range)

      // Filter by exact range
      const mobsInRange = nearbyMobs.filter(mob => {
        const dx = mob.position.x - tower.origin.x
        const dy = mob.position.y - tower.origin.y
        return Math.sqrt(dx * dx + dy * dy) <= towerType.range
      })

      // Attack logic...
    })
  })
}
```

**Expected Impact:**
- Before: 100 towers × 400 mobs = 40,000 checks/tick
- After: 100 towers × 10 nearby mobs = 1,000 checks/tick
- **40× faster tower targeting**

---

### Phase 5: Delta Compression (Day 5-6)

#### Step 5.1: Delta Calculation

**File:** `apps/tower-defense/api/src/services/deltaCompression.ts`

```typescript
interface GameDelta {
  tick: number
  mobsUpdated: Array<{ id: string; position: Position; currentHp: number }>
  mobsAdded: ActiveMob[]
  mobsRemoved: string[]
  towersAdded: PlacedTower[]
  towersRemoved: string[]
  playersUpdated: Array<{ id: string; hp?: number; gold?: number }>
}

export function calculateDelta(
  prevState: GameTickerState,
  newState: GameTickerState
): GameDelta {
  const delta: GameDelta = {
    tick: newState.tick,
    mobsUpdated: [],
    mobsAdded: [],
    mobsRemoved: [],
    towersAdded: [],
    towersRemoved: [],
    playersUpdated: [],
  }

  // Track mobs
  const prevMobIds = new Set(prevState.activeMobs.map(m => m.id))
  const newMobIds = new Set(newState.activeMobs.map(m => m.id))

  // New mobs
  newState.activeMobs.forEach(mob => {
    if (!prevMobIds.has(mob.id)) {
      delta.mobsAdded.push(mob)
    } else {
      // Check if position or HP changed
      const prevMob = prevState.activeMobs.find(m => m.id === mob.id)!
      const posChanged =
        mob.position.x !== prevMob.position.x ||
        mob.position.y !== prevMob.position.y
      const hpChanged = mob.currentHp !== prevMob.currentHp

      if (posChanged || hpChanged) {
        delta.mobsUpdated.push({
          id: mob.id,
          position: mob.position,
          currentHp: mob.currentHp,
        })
      }
    }
  })

  // Removed mobs
  prevMobIds.forEach(id => {
    if (!newMobIds.has(id)) {
      delta.mobsRemoved.push(id)
    }
  })

  // Similar for towers and players...

  return delta
}
```

#### Step 5.2: Apply Delta on Client

**File:** `apps/tower-defense/web/src/contexts/GameContext.tsx`

```typescript
const [game, setGame] = useState<Game | null>(null)

useEffect(() => {
  // Initial full state
  socket.on('initialState', (data) => {
    useEntityRegistry.getState().setMobTypes(data.mobTypes)
    useEntityRegistry.getState().setTowerTypes(data.towerTypes)
    setGame(data.game)
  })

  // Delta updates
  socket.on('delta', (delta: GameDelta) => {
    setGame(prevGame => {
      if (!prevGame) return prevGame

      const newGame = { ...prevGame }

      // Apply mob changes
      let mobs = [...prevGame.activeMobs]

      // Remove mobs
      mobs = mobs.filter(m => !delta.mobsRemoved.includes(m.id))

      // Add mobs
      mobs.push(...delta.mobsAdded)

      // Update mobs
      delta.mobsUpdated.forEach(update => {
        const mob = mobs.find(m => m.id === update.id)
        if (mob) {
          mob.position = update.position
          mob.currentHp = update.currentHp
        }
      })

      newGame.activeMobs = mobs
      newGame.tick = delta.tick

      // Apply tower/player changes...

      return newGame
    })
  })
}, [socket])
```

---

## 🧪 TESTING STRATEGY

### Unit Tests
- EntityRegistry: add/get/getAll for mobs/towers
- SpatialGrid: insert, getNearby, edge cases
- Delta calculation: mobs added/removed/updated

### Integration Tests
- Full game flow with normalized types
- Spatial grid performance (40,000 → 1,000 checks)
- Delta compression (154KB → 2KB)

### Load Tests
```bash
# After implementation
pnpm test:stress  # 32 players, should pass
pnpm test:density # 800 mobs + 200 towers, target 55+ FPS
```

---

## 📈 SUCCESS METRICS

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| **Bandwidth** | 616KB/sec | 8KB/sec | Socket.IO payload size |
| **FPS (400 mobs)** | 43 FPS | 55+ FPS | PerformanceMonitor (F3) |
| **Tower targeting** | 40,000 checks | 1,000 checks | Console logs in ticker |
| **Memory** | 150KB | 20KB | Chrome DevTools |

---

## 🚨 MIGRATION CHECKLIST

### Before Starting
- [ ] Create feature branch `feat/performance-optimization`
- [ ] Backup production database
- [ ] Document current performance baseline

### Phase 1 - Types
- [x] Create MobType and TowerType schemas
- [x] Update ActiveMob to use mobTypeId
- [x] Update PlacedTower to use towerTypeId
- [ ] Create entityRegistry service
- [ ] Seed initial mob/tower types
- [ ] Update Game schema to include types arrays

### Phase 2 - API
- [ ] Update spawnMob service
- [ ] Update placeTower service
- [ ] Update tickerEngine mob loops
- [ ] Update tickerEngine tower loops
- [ ] Update gameActions handlers
- [ ] Add registry to socket handshake

### Phase 3 - Client
- [ ] Create useEntityRegistry store
- [ ] Update GameContext to load types
- [ ] Update MultiPlayerCanvas mob rendering
- [ ] Update MultiPlayerCanvas tower rendering
- [ ] Update shops to use type references
- [ ] Test rendering with new types

### Phase 4 - Spatial Grid
- [ ] Implement SpatialGrid class
- [ ] Add unit tests
- [ ] Integrate into tickerEngine
- [ ] Benchmark performance improvement
- [ ] Validate tower targeting accuracy

### Phase 5 - Delta Compression
- [ ] Implement calculateDelta
- [ ] Update socket emissions
- [ ] Implement client-side delta application
- [ ] Add snapshot fallback (every 10 ticks)
- [ ] Test with multiple clients

### Testing
- [ ] Run all unit tests
- [ ] Run load tests (test:stress, test:density)
- [ ] Manual testing with PerformanceMonitor
- [ ] Verify no regressions in gameplay

### Deployment
- [ ] Merge to master
- [ ] Deploy API
- [ ] Deploy Web
- [ ] Monitor performance in production
- [ ] Update TYPES-AUDIT.md with results

---

## 🎯 NEXT IMMEDIATE STEP

**Recommended:** Start with Phase 1 completion (entityRegistry)

```bash
# Create registry service
touch apps/tower-defense/api/src/services/entityRegistry.ts

# Update index.ts to initialize registry
# Test with mockMobTypes/mockTowerTypes
```

Want me to implement the entityRegistry service now?
