# 🎨 AUDIT FRONTEND - Tower Defense Performance

**Date:** 11/01/2025
**Fichier audité:** `apps/tower-defense/web/src/app/[locale]/game/components/MultiPlayerCanvas.tsx` (619 lignes)

---

## ❌ PROBLÈMES CRITIQUES DE PERFORMANCE

### 1. 🔴 **RE-RENDER COMPLET À CHAQUE FRAME (60 FPS)**

**Ligne 456:**
```typescript
}, [towers, path, draggedTower, grassPattern, isCurrentPlayer, selectedPlayer, activeMobs])
```

**Problème:** Le `useEffect` du loop de dessin **redémarre complètement** dès qu'une dépendance change.

**Impact avec centaines de mobs:**
- Chaque update serveur (250ms) → Re-render complet
- Nouveau `requestAnimationFrame` loop créé
- Perte de l'ancien loop (fuite mémoire potentielle)
- **Calcul de pathSet** refait à chaque frame

**Solution:** Séparer le loop du canvas des dépendances changeantes avec `useRef`

---

### 2. 🔴 **REDESSINE 100% DU TERRAIN À CHAQUE FRAME**

**Lignes 198-216:**
```typescript
// Fond herbe (hors path)
for (let y = 0; y < ZONE_HEIGHT; y++) {       // 20 itérations
  for (let x = 0; x < ZONE_WIDTH; x++) {      // 20 itérations
    const key = `${x},${y}`                   // 400 string allocations
    if (!pathSet.has(key)) {
      // ... dessine tile
    }
  }
}
```

**Calcul:**
- Canvas 20×20 = **400 tiles**
- 60 FPS = **24,000 tiles/seconde**
- **24,000 string allocations/seconde** pour les clés

**Impact:**
- Garbage collector sollicité en permanence
- CPU à 100% juste pour le fond statique
- **Le fond ne change JAMAIS** mais est redessiné 60× par seconde

**Solution:**
- Layer système (fond statique en arrière-plan)
- OU Canvas offscreen pour le terrain
- OU Dirty rectangles (redessiner que ce qui change)

---

### 3. 🔴 **INTERPOLATION RECALCULÉE POUR CHAQUE MOB × 2 FOIS**

**Lignes 282-336:**
```typescript
// 1ère passe: Grouper les mobs par position
interpolatedMobsRef.current.forEach(mob => {
  const elapsed = nowMobs - mob.lastUpdateTime
  const t = Math.min(elapsed / TICK_INTERVAL_MS, 1)
  const interpolatedX = mob.prevPosition.x + (mob.targetPosition.x - mob.prevPosition.x) * t
  const interpolatedY = mob.prevPosition.y + (mob.targetPosition.y - mob.prevPosition.y) * t
  // ...
})

// 2ème passe: Dessiner les mobs
interpolatedMobsRef.current.forEach(mob => {
  const elapsed = nowMobs - mob.lastUpdateTime  // REDONDANT !
  const t = Math.min(elapsed / TICK_INTERVAL_MS, 1)  // REDONDANT !
  const interpolatedX = mob.prevPosition.x + ...  // REDONDANT !
  const interpolatedY = mob.prevPosition.y + ...  // REDONDANT !
  // ...
})
```

**Impact avec 200 mobs:**
- **400 calculs d'interpolation** par frame
- **400 calculs `Math.min`** par frame
- 60 FPS = **24,000 interpolations/seconde** (dont 12,000 redondantes)

**Solution:** Calculer une seule fois et stocker la position interpolée

---

### 4. 🔴 **CRÉATION DE STRINGS POUR REGROUPEMENT**

**Lignes 292, 374:**
```typescript
const key = `${Math.round(interpolatedX * 10)},${Math.round(interpolatedY * 10)}`
```

**Impact avec 200 mobs + 100 projectiles:**
- **300 template literals** par frame
- **300 Map lookups** par frame
- 60 FPS = **18,000 allocations de strings/seconde**

**Solution:** Utiliser un hash numérique au lieu de strings

---

### 5. 🟡 **GRADIENT CRÉÉ POUR CHAQUE TILE DE CHAQUE TOUR**

**Lignes 240-248:**
```typescript
if (paint.kind === 'dual') {
  const gradient = ctx.createLinearGradient(...)  // PAR TILE !
  gradient.addColorStop(0, paint.color)
  gradient.addColorStop(1, paint.colorB!)
  ctx.fillStyle = gradient
}
```

**Impact avec 50 tours (moyenne 4 tiles chacune):**
- **200 gradients** créés par frame
- 60 FPS = **12,000 gradients/seconde**

**Solution:** Cache de gradients (Map<towerType, gradient>)

---

### 6. 🟡 **BARRE DE VIE POUR CHAQUE MOB**

**Lignes 321-335:**
```typescript
if (mob.currentHp < mob.mob.hp) {
  // 8 opérations de dessin par mob
  ctx.fillStyle = '#4b5563'
  ctx.fillRect(...)  // Fond
  ctx.fillStyle = ...
  ctx.fillRect(...)  // HP actuel
}
```

**Impact avec 200 mobs (tous endommagés):**
- **1,600 fillRect** par frame
- 60 FPS = **96,000 fillRect/seconde**

**Solution:**
- Culling (ne dessiner que les mobs visibles à l'écran)
- Sprite atlas pour barres de vie précalculées

---

### 7. 🟢 **POINTS POSITIFS**

✅ **Interpolation fluide** - Bon système pour 60 FPS depuis ticker 4 Hz
✅ **Monitoring FPS** - Warnings automatiques si < 30 FPS
✅ **useMemo pour activeMobs** - Évite recalcul inutile
✅ **Map pour interpolatedMobs** - Meilleur que array
✅ **Groupement des entités** - Affiche "x5" au lieu de 5 sprites

---

## 📊 ESTIMATION PERFORMANCE ACTUELLE

### Scénario Réaliste: 8 joueurs, 100 mobs, 30 tours

**Par frame (16ms budget pour 60 FPS):**
```
Fond terrain:         400 tiles × (1 fillRect + 1 string)     = ~2ms
Tours:                30 tours × 4 tiles × gradient          = ~1ms
Mobs interpolation:   100 mobs × 2 calculs                   = ~1ms
Mobs dessin:          100 mobs × (arc + fillRect)            = ~2ms
Barres de vie:        100 mobs × 2 fillRect                  = ~1ms
Projectiles:          50 projectiles × arc                   = ~0.5ms
Texte compteurs:      20 compteurs × strokeText + fillText   = ~0.5ms
-------------------------------------------------------------------
TOTAL:                                                        ~8ms ✅
```

**✅ Devrait tenir 60 FPS**

### Scénario Stress: 16 joueurs, 400 mobs, 100 tours

**Par frame:**
```
Fond terrain:         400 tiles                              = ~2ms
Tours:                100 tours × 4 tiles × gradient         = ~3ms
Mobs interpolation:   400 mobs × 2 calculs                   = ~4ms
Mobs dessin:          400 mobs × (arc + fillRect)            = ~8ms
Barres de vie:        400 mobs × 2 fillRect                  = ~4ms
Projectiles:          200 projectiles × arc                  = ~2ms
-------------------------------------------------------------------
TOTAL:                                                        ~23ms ❌
```

**❌ FPS chuterait à ~43 FPS** (perceptible)

### Scénario Extrême: 32 joueurs, 800 mobs, 200 tours

**Par frame:**
```
Fond terrain:         400 tiles                              = ~2ms
Tours:                200 tours × 4 tiles × gradient         = ~6ms
Mobs interpolation:   800 mobs × 2 calculs                   = ~8ms
Mobs dessin:          800 mobs × (arc + fillRect)            = ~16ms
Barres de vie:        800 mobs × 2 fillRect                  = ~8ms
Projectiles:          400 projectiles × arc                  = ~4ms
-------------------------------------------------------------------
TOTAL:                                                        ~44ms ❌
```

**❌ FPS chuterait à ~22 FPS** (lag visible)

---

## 🚀 OPTIMISATIONS RECOMMANDÉES (PAR PRIORITÉ)

### 🔥 PRIORITÉ 1: Terrain Statique (Gain: ~2ms/frame)

```typescript
// Créer un canvas offscreen pour le terrain
const terrainCanvasRef = useRef<HTMLCanvasElement | null>(null)

useEffect(() => {
  // Dessiner le terrain UNE SEULE FOIS
  const terrainCanvas = document.createElement('canvas')
  terrainCanvas.width = ZONE_WIDTH * TILE_SIZE
  terrainCanvas.height = ZONE_HEIGHT * TILE_SIZE
  const terrainCtx = terrainCanvas.getContext('2d')!

  // Dessiner fond + path
  // ...

  terrainCanvasRef.current = terrainCanvas
}, [path, grassPattern]) // Recalculer SEULEMENT si path change

// Dans le loop de dessin:
if (terrainCanvasRef.current) {
  ctx.drawImage(terrainCanvasRef.current, 0, 0)
}
```

### 🔥 PRIORITÉ 2: Interpolation Unique (Gain: ~2-4ms/frame avec 200+ mobs)

```typescript
// Calculer positions UNE SEULE FOIS
const interpolatedPositions = new Map<string, {x: number, y: number, mob: InterpolatedMob}>()
interpolatedMobsRef.current.forEach(mob => {
  const elapsed = now - mob.lastUpdateTime
  const t = Math.min(elapsed / TICK_INTERVAL_MS, 1)
  const x = mob.prevPosition.x + (mob.targetPosition.x - mob.prevPosition.x) * t
  const y = mob.prevPosition.y + (mob.targetPosition.y - mob.prevPosition.y) * t

  interpolatedPositions.set(mob.id, { x, y, mob })
})

// Utiliser partout après
```

### 🔥 PRIORITÉ 3: Gradient Cache (Gain: ~1-3ms/frame avec 50+ tours)

```typescript
const gradientCacheRef = useRef(new Map<string, CanvasGradient>())

// Créer gradient UNE SEULE FOIS par type
const getGradient = (elementalType: string, x: number, y: number): CanvasGradient => {
  const cacheKey = `${elementalType}-${x}-${y}`
  let gradient = gradientCacheRef.current.get(cacheKey)

  if (!gradient) {
    gradient = ctx.createLinearGradient(...)
    gradientCacheRef.current.set(cacheKey, gradient)
  }

  return gradient
}
```

### 🟡 PRIORITÉ 4: Culling Spatial (Gain: ~5-10ms avec 400+ mobs hors écran)

```typescript
// Ne dessiner que ce qui est visible
const viewport = {
  minX: 0,
  minY: 0,
  maxX: ZONE_WIDTH,
  maxY: ZONE_HEIGHT
}

const visibleMobs = Array.from(interpolatedPositions.values()).filter(({x, y}) =>
  x >= viewport.minX && x <= viewport.maxX &&
  y >= viewport.minY && y <= viewport.maxY
)

// Dessiner SEULEMENT visibleMobs
```

### 🟡 PRIORITÉ 5: Batching des Styles (Gain: ~1-2ms)

```typescript
// Grouper les mobs par couleur pour réduire les changements de style
const mobsByColor = new Map<string, typeof visibleMobs>()

visibleMobs.forEach(mob => {
  const color = ELEMENTAL_COLORS[mob.mob.elementalType]
  if (!mobsByColor.has(color)) {
    mobsByColor.set(color, [])
  }
  mobsByColor.get(color)!.push(mob)
})

// Dessiner par batch
mobsByColor.forEach((mobs, color) => {
  ctx.fillStyle = color
  mobs.forEach(mob => {
    ctx.beginPath()
    ctx.arc(...)
    ctx.fill()
  })
})
```

---

## 🎯 GAIN ESTIMÉ APRÈS OPTIMISATIONS

### Scénario Extrême: 32 joueurs, 800 mobs, 200 tours

**Avant:** ~44ms/frame (22 FPS) ❌
**Après:**
```
Fond terrain (offscreen):     0.5ms (au lieu de 2ms)
Tours (gradient cache):       2ms (au lieu de 6ms)
Mobs (interpolation unique):  4ms (au lieu de 8ms)
Mobs dessin (culling):        8ms (au lieu de 16ms, si 50% hors écran)
Barres de vie (culling):      4ms (au lieu de 8ms)
Projectiles (culling):        2ms (au lieu de 4ms)
-------------------------------------------------------
TOTAL:                        ~20.5ms ✅
```

**Après:** ~20ms/frame (50 FPS) ✅ **Amélioration de 114%**

---

## 📋 TODO - Optimisations Frontend

- [ ] **P1:** Canvas offscreen pour terrain statique
- [ ] **P1:** Interpolation calculée une seule fois
- [ ] **P1:** Cache de gradients pour tours
- [ ] **P2:** Culling spatial (viewport)
- [ ] **P2:** Batching des styles canvas
- [ ] **P3:** Sprite atlas pour barres de vie
- [ ] **P3:** Web Workers pour calculs d'interpolation
- [ ] **P3:** OffscreenCanvas (si navigateurs supportent)

---

## 🧪 TEST À CRÉER

Besoin d'un **test de densité d'entités backend** pour valider :
- 1 joueur avec 500 mobs
- 1 joueur avec 100 tours
- 1 joueur avec 500 mobs + 100 tours simultanément

Ensuite test frontend avec monitoring FPS en live.
