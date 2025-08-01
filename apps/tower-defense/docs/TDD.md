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

## 📦 Dossier `tower-defense/api/`

Le backend repose sur **Express.js** et **Socket.IO** pour assurer une communication temps réel stable entre les joueurs et le moteur de jeu. Il gère la logique centrale, la validation des actions, et la synchronisation de l'état partagé.

### 🔧 Rôles principaux

- 🔌 Connexion des joueurs (`/create`, `/join`, etc.)
- 🔁 Boucle de jeu (`Game loop engine`) – 1 tick toutes les **30 secondes**  
  > Un tick ici représente une **boucle de jeu complète** : income, shop, envoi d’unités.  
  > ⚠️ Ce n’est pas un tickrate moteur type FPS/physique.
- 🛰️ Diffusion temps réel du game state (`socket.emit('state_update')`, etc.)
- 📥 Validation des actions joueurs (achat, placement, envoi d’unités)
- 🧠 Stockage en mémoire (MongoDB, PostgreSQL possible plus tard)

---

### 🗂️ Dossiers principaux

> Les modèles Mongoose doivent refléter strictement les types définis dans `@ezstart/types/tower-defense`.

| Dossier      | Description                                                                 |
|--------------|-----------------------------------------------------------------------------|
| `models/`    | Schémas Mongoose des entités persistées (`Game`, `Player`, etc.)            |
| `routes/`    | Déclaration des routes REST Express.js (`/games`, etc.)                     |
| `controllers/` | Contrôleurs REST : connecteurs entre routes et logique métier            |
| `services/`  | Logique métier (join game, leave, start, etc.)                              |
| `socket/`    | *(à créer)* Logique Socket.IO : rooms, events, broadcast, actions           |
| `engine/`    | *(à créer)* Moteur de boucle : income, shop, traitement des actions         |

---
## 🖥️ Dossier `tower-defense/pwa/`

L’application frontend est une **PWA Next.js** typée avec **TypeScript** et stylée avec **Tailwind CSS**. Elle est conçue pour fonctionner sur desktop et mobile, et communique avec le backend via **Socket.IO** en temps réel.

### 🎮 Rôles principaux

- 🎲 Interface de jeu en temps réel (placement, shop, envoi, etc.)
- 🔌 Connexion aux sockets (`useGameSocket`, `usePlayerActions`, etc.)
- 🧠 Stockage local via Zustand (`gameStore.ts`)
- 🧭 Routing multilingue (`[locale]/`)
- 🔁 Intégration à la game loop (tick 30s)
- 🧩 Composants modulaires pour l’UI du joueur

---

### 🗂️ Dossiers principaux

| Dossier        | Description                                                                 |
|----------------|-----------------------------------------------------------------------------|
| `app/`         | Structure Next.js avec routing dynamique (`gameId`, `lobby`, `post-game`, etc.) |
| `hooks/`       | Custom hooks pour l’état de jeu, les sockets, les actions                  |
| `providers/`   | Contextes React pour injecter l’état global (`GameProvider`)               |
| `stores/`      | Store Zustand typé pour gérer l’état local du joueur et du jeu             |
| `components/`  | *(centralisation à venir)* Composants UI globaux (boutons, icônes...)      |
| `utils/`       | Helpers typés pour gérer les entités du jeu (game, player, tower, etc.)     |
| `i18n/`        | Fichiers de routing/requests pour `next-intl`                              |
| `messages/`    | Fichiers de traduction JSON par langue (`common.json`)                     |
| `public/`      | Fichiers statiques (images, JSON, etc.)                                    |

---

### 🧩 Focus composants `app/[locale]/game/components/`

> Composants clés pour l'affichage et les interactions en jeu

| Composant           | Rôle                                                                 |
|---------------------|----------------------------------------------------------------------|
| `GameCanvas`        | Canvas principal du terrain (pathing, placement, unités)            |
| `Hud`               | Affichage des infos globales (gold, income, phase, etc.)            |
| `TowerPlacer`       | Interface pour poser ses tours dynamiquement                        |
| `MobSpawner`        | UI pour acheter et envoyer des unités vers les adversaires          |
| `PlayerStatsPanel`  | Résumé des stats de son joueur (HP, income, shop, main...)          |

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
