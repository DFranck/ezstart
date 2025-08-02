# 🎮 In-Game – Canvas de jeu

## 🗺️ Carte (canvas)

Le `<GameCanvas />` est la représentation visuelle principale de la **zone de jeu**.

- La map est un tableau 2D typé :
  ```ts
  map: string[][]; // z.array(z.array(z.string()))
  ```
- Chaque case représente une tuile de jeu (tile). Exemple : `"grass"`, `"path"`, `"build"`, `"empty"`...

---

## 🎯 Taille & grille

- 📦 **Case (tile)** : unité de base du pathing, du placement, etc.  
  ➤ Exemple : `32x32px` ou `48x48px` (selon densité cible)
- 🧍 **Unité (mob)** : occupe **1 seule case**, déplacement de case en case
- 🗼 **Tour (tower)** : occupe **plusieurs cases** (forme Tetris), définie par `tower.shape: boolean[][]`
- 🧑‍🤝‍🧑 **Zone joueur** : chaque joueur a une **zone délimitée** sur la map
  - 📦 Option 1 : canvas unique avec **fog of war** (zones adverses masquées)
  - 📦 Option 2 : canvas individuel avec leur propre map côté client (plus simple mais moins stratégique)

---

## 🧱 Exemples de formes de tours (`tower.shape`)

```ts
[
  [true, true],
  [false, true],
];
// En forme de "L"
```

```ts
[
  [true, true, true],
  [false, true, false],
];
// En croix étroite
```

---

## 🧪 Placement des tours

- ✅ Position initiale définie par `tower.position = { x, y }`
- ✅ Forme appliquée **relativement à ce point** (`shape[y][x]`)
- ✅ Vérification requise côté moteur :
  - Collision avec d'autres tours
  - Placement interdit sur un chemin
  - Placement interdit en dehors de la zone joueur

---

## 🔦 Fog of War (optionnel)

- Chaque joueur ne voit **que sa propre map** (ou les bords des autres)
- Possibilité de montrer :
  - Les envois de mobs en approche (icônes génériques)
  - Des ombres/flèches pour montrer d'où viennent les attaques

---

## 🛒 Shop / Items

- Deux options à définir :
  1. **Shop commun RNG** : tours + unités sont tirés aléatoirement pour tous les joueurs (comme TFT)
  2. **Shop split** :
     - 🎯 **Tours** = RNG
     - 💥 **Unités à envoyer** = liste fixe (mais avec scaling de coût selon phase)

---

## 🛡️ Types à usage du canvas

- `Tower` (avec shape[][] et position)
- `Mob` (avec position dynamique)
- `MapTile[][]` (`"grass"`, `"build"`, `"path"`, etc.)
- `GameState` pour afficher l’état actuel
- `PlayerViewOptions` pour savoir quoi afficher/fog/etc.

---

## 🧩 Composants clés

| Composant        | Rôle                                               |
| ---------------- | -------------------------------------------------- |
| `GameCanvas`     | Canvas principal, grille de jeu, rendu des entités |
| `TowerPlacer`    | Overlay visuel pour montrer où placer une tour     |
| `MobRenderer`    | Affiche les mobs en cours de route                 |
| `FogOfWar`       | Masque les zones non visibles selon la zone joueur |
| `PathVisualizer` | (optionnel) pour debug du pathing                  |

---

## 🧠 À prévoir côté moteur

- `getOccupiedTiles(tower.shape, tower.position): { x, y }[]`
- `canPlaceTower(map, tower): boolean`
- `moveMob(mob, path): { x, y }` à chaque tick
- `detectCollision(unit, towers): boolean`

---

## 🚧 À définir

- [ ] Taille des cases (pixel)
- [ ] Shape max des tours (3x3 ? 4x4 ?)
- [ ] Durée de vie des mobs (despawn ?)
- [ ] Mode de rendu : Canvas, SVG ou DOM div ? (perf vs dev speed)
