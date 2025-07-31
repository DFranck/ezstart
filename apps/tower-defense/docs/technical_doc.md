# 📘 Tower Defense PvP – Technical Design Document (TDD)

### 🧱 Objectif

Créer une architecture **modulaire, scalable, et réutilisable** pour un jeu Tower Defense multijoueur :

- Jouable en temps réel
- Facilement portable sur mobile plus tard (React Native)
- Backend unique (pas besoin de retoucher l’API / sockets)
- Organisation type monorepo

---

## ⚙️ Stack Technique

| Côté        | Technologie      | Rôle / Pourquoi                                                          |
| ----------- | ---------------- | ------------------------------------------------------------------------ |
| Frontend    | **Next.js**      | SSR pour compatibilité SEO + portabilité React/React Native + modularité |
| Frontend    | **Tailwind CSS** | Design rapide, responsive, maintenable                                   |
| Frontend    | **Zustand**      | Store client léger pour synchroniser état local entre composants         |
| Backend API | **Express.js**   | API REST minimale, base solide, extensible facilement                    |
| Temps réel  | **Socket.IO**    | Com pour les events joueurs / state partagé. Compatible navigateur et RN |
| Types       | **TypeScript**   | Typage strict pour éviter les bugs et assurer cohérence cross-app        |
| Monorepo    | **pnpm + Turbo** | Build optimisé, partage de code entre apps/packages                      |

---

## 📦 Description des dossiers

### `td/api/`

- Serveur Express.js avec Socket.IO
- Gère :
  - Connexion des joueurs (`/create`, `/join`)
  - Broadcast du game state (`socket.emit('state_update')`)
  - Tick engine (interval de 30s)
  - Validation des actions joueurs (placement, achat, envoi)
  - Stockage en mémoire (MongoDB/PostgreSQL plus tard)

---

### `td/pwa/`

- App React (Next.js)
- Affiche :
  - Carte du joueur (placement)
  - Shop (tours, unités)
  - Gold, income, HP, logs, etc.
- Communique en direct avec `api` via Socket.IO

---

### `td/api/game/` ou `td/shared/`

- Typage TypeScript commun (`types.ts`)
- Logique pure réutilisable (pathfinding, moteur de jeu)
- Objectif : testable sans dépendance UI/serveur

---

## 🔌 Communication temps réel

### Socket.IO Events

#### Front ➞ Back

```ts
emit('connect_to_game', { playerId, gameId });
emit('player_action', { type: 'place', payload: { towerId, x, y } });
emit('player_action', { type: 'send', payload: { mobType } });
```

#### Back ➞ Front

```ts
emit('state_update', { gameState })
emit('new_shop', { items: ShopItem[] })
emit('tick', { tickNumber, goldGain })
emit('player_eliminated', { playerId })
emit('game_over', { winner })
```

---

## 🧠 Types partagés (ex: `td/api/game/types.ts`)

```ts
type GameState = {
  players: Player[];
  tick: number;
  map: MapTile[][];
  shop: ShopItem[];
  phase: 'waiting' | 'playing' | 'finished';
};

type Player = {
  id: string;
  name: string;
  gold: number;
  income: number;
  hp: number;
  hand: Tower[];
  placedTowers: Tower[];
  incomingUnits: Mob[];
};

type Tower = {
  id: string;
  type: 'archer' | 'bomb' | 'ice';
  position: { x: number; y: number };
  damage: number;
  range: number;
};

type Mob = {
  id: string;
  type: 'goblin' | 'wolf' | 'boss';
  hp: number;
  speed: number;
  effects?: Effect[];
};

type ShopItem = {
  id: string;
  name: string;
  type: 'tower' | 'unit';
  price: number;
};
```

---

## 🧪 Testabilité

- Tous les composants logiques seront testables via Jest
- Tu peux simuler un combat, un pathfinding, ou une économie en pur Node

---

## 🚀 Avantages de cette approche

- 🔀 Réutilisable partout (même code entre web et mobile)
- 🧹 Architecture découpée propre (séparation state / rendering)
- 📱 Prépare une version React Native facilement
- 🧪 Testable à tout moment
- 🎮 Le moteur de jeu tourne même sans UI (headless pour dev bot/test IA)
