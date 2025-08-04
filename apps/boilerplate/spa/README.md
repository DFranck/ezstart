<!-- AUTO:TITLE:START -->

# 📦 pwa-random-tower-defense

<!-- AUTO:TITLE:END -->

<!-- AUTO:DESC:START -->

Competitive multiplayer Tower Defense game. Combines RNG shop mechanics (auto-battler style), dynamic pathing with free tower placement, and unit-sending PvP (old school Warcraft TD). Players build, defend, and attack in a real-time loop with evolving income. High replayability and skill-based late game.

<!-- AUTO:DESC:END -->

<!-- AUTO:GETTING_STARTED:START -->

```bash
# 1️⃣ Clone the public repo and move to this package if it's public
git clone https://github.com/DFranck/ezstart-public.git
cd apps/td/pwa

# 2️⃣ Install dependencies
pnpm install

# 3️⃣ Run the package
pnpm dev
```

<!-- AUTO:GETTING_STARTED:END -->

## 🎮 Game Design

Read the full gameplay logic, mechanics, and balance strategy here:  
👉 [📄 game-design.md](../docs/GDD.md)

<!-- AUTO:PROJECT_STRUCTURE:START -->
## 📂 Project Structure

👉 See the full structure here: [structure.md](./structure.md)
<!-- AUTO:PROJECT_STRUCTURE:END -->

<!-- AUTO:TYPES:START -->

### 🧾 Domain Types for `tower-defense`

- [game-state.ts](../../packages/types/tower-defense/game-state.ts)
- [game.ts](../../packages/types/tower-defense/game.ts)
- [index.ts](../../packages/types/tower-defense/index.ts)
- [mob.ts](../../packages/types/tower-defense/mob.ts)
- [player.ts](../../packages/types/tower-defense/player.ts)
- [position.ts](../../packages/types/tower-defense/position.ts)
- [rpc.ts](../../packages/types/tower-defense/rpc.ts)
- [shop-item.ts](../../packages/types/tower-defense/shop-item.ts)
- [tower.ts](../../packages/types/tower-defense/tower.ts)
<!-- AUTO:TYPES:END -->

<!-- AUTO:QUICK_OVERVIEW:START -->
### 📁 Quick Overview
- **app/** → No description provided
- **components/** → No description provided
- **contexts/** → No description provided
- **hooks/** → No description provided
- **i18n/** → No description provided
- **messages/** → No description provided
- **providers/** → No description provided
- **public/** → No description provided
- **stores/** → No description provided
- **styles/** → No description provided
- **utils/** → No description provided
<!-- AUTO:QUICK_OVERVIEW:END -->