# 🎮 Tower Defense - Gameplay Design

**Game Design Document (GDD) + Technical Design Document (TDD) consolidé**

---

## 🎯 Game Concept

**Genre:** Multiplayer Competitive Tower Defense
**Platform:** Web (Next.js + Socket.IO)
**Players:** 2-8 simultaneous

### Core Loop

```
1. Place Towers → Defend your base
2. Spawn Mobs → Attack opponent's base
3. Earn Gold → From tower kills + passive income
4. Upgrade → Better towers, stronger mobs
5. Victory → Destroy opponent's base first
```

---

## 🏰 Towers

### 15 Tower Types (5 Elements × 3 Variants)

**Normal:**
- **Archer Tower** - Single target, balanced
- **Sniper Tower** - Long range, high damage
- **Cannon Tower** - AoE splash damage

**Fire:**
- **Flame Thrower** - Continuous burn DoT
- **Inferno Tower** - AoE burn
- **Phoenix Nest** - Dual-type attacks

**Water:**
- **Ice Shard** - Slows targets
- **Blizzard Tower** - AoE slow
- **Tidal Wave** - Hybrid damage

**Grass:**
- **Vine Snare** - Fast attack speed
- **Nature Guardian** - 2×2 size, high HP
- **Overgrowth** - Hybrid effects

**Electric:**
- **Tesla Coil** - Stuns targets
- **Lightning Storm** - Chain lightning
- **Thunderforge** - Highest single-target DPS

### Tower Stats

```typescript
{
  damage: number           // Base damage per hit
  range: number            // Attack range (tiles)
  attackSpeed: number      // Attacks per second
  cost: number             // Gold to place
  upgradeCost: number      // Gold to upgrade
  elementalType: Element   // Damage type
  effects: Effect[]        // Special effects (slow, burn, stun)
  size: [number, number]   // Grid size (1x1, 2x2)
}
```

---

## 👾 Mobs

### 15 Mob Types (5 Elements × 3 Variants)

**Normal:**
- **Basic Slime** - Fast, low HP
- **Armored Knight** - High HP, slow
- **Flying Bat** - Ignores ground towers

**Fire:**
- **Fire Imp** - Fast, resistant to fire
- **Lava Golem** - Tank with fire immunity
- **Phoenix** - Resurrects once

**Water:**
- **Water Sprite** - Fast, extinguishes fire
- **Ice Giant** - Slows nearby towers
- **Frost Dragon** - Boss-tier, high HP

**Grass:**
- **Vine Walker** - Regenerates HP
- **Treant** - Spawns saplings on death
- **Poison Bee** - Flying, poisons towers

**Electric:**
- **Spark Wisp** - Fast, stuns on death
- **Thunder Titan** - Tank, electric immunity
- **Lightning Hawk** - Flying, chain attacks

### Mob Stats

```typescript
{
  hp: number               // Health points
  speed: number            // Movement speed
  damage: number           // Damage to base
  reward: number           // Gold on kill
  cost: number             // Gold to spawn
  elementalType: Element   // Resistance type
  abilities: Ability[]     // Special abilities
}
```

---

## ⚔️ Combat System

### Elemental Interactions

```
Fire → Grass (2× damage)
Grass → Water (2× damage)
Water → Fire (2× damage)
Electric → Water (1.5× damage)
Normal → All (1× damage)
```

### Effects

**Burn (Fire):**
- 10% damage per second for 3 seconds
- Does not stack

**Slow (Water):**
- -50% movement speed for 2 seconds
- Stacks additively (max -90%)

**Stun (Electric):**
- 100% stop for 1 second
- Does not stack

**Poison (Grass):**
- 5% damage per second for 5 seconds
- Stacks multiplicatively

---

## 💰 Economy

### Gold Sources

**Passive Income:**
- 10 gold/second base
- +2 gold/second per wave survived
- Shared across all players

**Tower Kills:**
- Basic mob: 5 gold
- Elite mob: 15 gold
- Boss mob: 50 gold

**Interest:**
- 1 gold per 100 gold saved (max 5/second)

### Costs

**Towers:**
- Tier 1: 50-100 gold
- Tier 2: 150-300 gold
- Tier 3: 400-600 gold

**Mobs:**
- Tier 1: 20-50 gold
- Tier 2: 80-150 gold
- Tier 3: 200-400 gold

---

## 🗺️ Map

### Grid System

```
Size: 20×20 tiles
Tile Size: 1 unit
Path: Pre-defined waypoints
Buildable: Green tiles
Unbuildable: Path + spawn/base
```

### Zones

**Spawn Area (Red):**
- Enemy mobs appear here
- Cannot build

**Path (Gray):**
- Mobs follow this
- Cannot build

**Buildable Area (Green):**
- Place towers here
- 1×1 or 2×2 tiles

**Base (Blue):**
- Your base (HP bar)
- Game over if destroyed

---

## 🎮 Phases

### 1. Waiting (Pre-Game)

- Players join lobby
- Host can start game
- Minimum 2 players

### 2. Preparation (30 seconds)

- Place initial towers
- Plan strategy
- Starting gold: 500

### 3. Combat (Until Victory)

- Mobs spawn every 10 seconds
- Towers auto-attack
- Earn gold, upgrade, spam mobs

### 4. End Game

- Victory screen
- Stats (kills, damage, gold)
- Rematch option

---

## 🏆 Win Conditions

**Primary:**
- Destroy all opponent bases (HP → 0)

**Secondary:**
- Last player standing (all others eliminated)

**Base HP:**
- Starting: 100 HP
- Mob reaches base: -10 HP per mob
- Boss reaches base: -50 HP

---

## 📊 Technical Specs

### Backend (Tower Defense API)

**Port:** 5030
**Tech:** Express + Socket.IO
**Database:** MongoDB (in-memory game state)

**Key Systems:**
- `GameManager` - Game instances
- `EntityManager` - Towers + Mobs factories
- `TickerEngine` - 4 ticks/second (250ms)
- `MovementSystem` - Pathfinding + collision
- `TowerSystem` - Targeting + damage
- `SpatialGrid` - O(n) collision detection

### Frontend (Tower Defense Web)

**Port:** 5035
**Tech:** Next.js + Canvas API
**Rendering:** 60 FPS interpolation

**Key Components:**
- `MultiPlayerCanvas` - Game rendering
- `TowerShop` - Place towers UI
- `MobShop` - Spawn mobs UI
- `GameStats` - Gold, HP, wave counter

### Networking

**Protocol:** WebSocket (Socket.IO)
**Events:**
```typescript
// Client → Server
'tower:place' { typeId, position }
'mob:spawn' { typeId }
'game:start'

// Server → Client
'game:state' { tick, players, mobs, towers }
'player:gold' { playerId, gold }
'base:damage' { playerId, hp }
```

### Performance

**Target:**
- Server tick: <200ms (currently ~5-15ms ✅)
- Client FPS: 60 FPS (stable ✅)
- Max players: 8
- Max mobs: 100+ simultaneous
- Max towers: 50 per player

---

## 🚀 Future Features

**Phase 3+:**
- [ ] Wave system (automatic mob spawning)
- [ ] Boss waves (every 10 waves)
- [ ] Power-ups (temporary buffs)
- [ ] Leaderboard (ELO rating)
- [ ] Replay system
- [ ] Spectator mode
- [ ] Custom maps (map editor)
- [ ] Team mode (2v2, 4v4)

---

## 📚 References

- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Load Testing:** [../api/LOAD-TESTING.md](../api/LOAD-TESTING.md)
- **README:** [../README.md](../README.md)
