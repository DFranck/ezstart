# Gacha Analyzer — Data Audit & Classification Improvement Backlog

> **Objectif** : Auditer les fichiers `/data` (constants de calcul), documenter les gaps par rapport au système de classification cible, et planifier les améliorations rune + démarrage artifact.

---

## Légende

- 🔴 **P0** — Bloquant pour classification correcte (bug silencieux ou résultat faux)
- 🟠 **P1** — Nécessaire pour le système cible (TRUE LEG MIN / QUAD / etc.)
- 🟡 **P2** — Amélioration qualité / précision
- 🟢 **P3** — Excellence long-terme
- ⚡ **QW** — Quick Win < 1 jour

---

## 1. État actuel des fichiers `/data` (constants de calcul)

### `types/src/rune-data.ts` — 1 208 lignes

| Constant                      | Statut       | Notes                                               |
| ----------------------------- | ------------ | --------------------------------------------------- |
| `SUBSTAT_ROLL_RANGES`         | ✅ Vérifié   | SPD 4-6, HP% 5-8, ATK% 5-8, etc.                    |
| `ANCIENT_SUBSTAT_BASE_RANGES` | ⚠️ Partiel   | 3 TODO: verify pour flat stats (hp, atk, def)       |
| `ANCIENT_LEGEND_GRIND_RANGES` | ✅ OK        | +1 max vs normal legend grinds                      |
| `ANCIENT_LEGEND_GEM_VALUES`   | ✅ OK        | Values per stat                                     |
| `MAIN_STAT_MAX`               | ✅ OK        | Slot 1-6, toutes stats                              |
| `GRIND_RANGES`                | ✅ OK        | magic/rare/hero/legend par stat                     |
| `GEM_RANGES`                  | ✅ OK        | Toutes raretés, toutes stats                        |
| `RUNE_SET_INFO`               | ✅ 22 sets   | seal/intangible absents                             |
| `SUBSTATS_BY_QUALITY`         | ✅ OK        | normal=0, magic=1, rare=2, hero=3, legend=4         |
| `UPGRADES_BY_QUALITY`         | ✅ OK        | Idem (normal=0, hero=3, legend=4)                   |
| `BUILD_ARCHETYPES`            | ✅ 14 types  | OK mais pas aligné avec classif cible               |
| `STAT_PRIORITY_WEIGHTS`       | ✅ OK        | 14 archetypes × 11 stats                            |
| `PROGRESSIVE_SELL_THRESHOLDS` | ✅ OK        | 3 profiles × 5 levels                               |
| `DEAD_STAT_COMBOS`            | ✅ OK        | ACC+RES, etc.                                       |
| `SET_STAT_TIERS`              | ⚠️ Incomplet | seal/intangible présents ici mais absent de RuneSet |
| `SET_STRENGTH`                | ✅ OK        | S/A/B/C/D                                           |
| `SET_ARCHETYPE_AFFINITY`      | ✅ OK        | Par set                                             |
| `SYNERGY_BONUS`               | ✅ OK        | PERFECT_4: 8, THREE_NO_ROLL: 8, etc.                |

**Donnée manquante critique** :

```
MAX_STAT_PER_RARITY = {
  hero:   { spd: 24, hp%: 32, atk%: 32, def%: 32, cr: 24, cd: 28, ... }
  legend: { spd: 30, hp%: 40, atk%: 40, def%: 40, cr: 30, cd: 35, ... }
}
```

Cette table est **calculable** depuis `SUBSTAT_ROLL_RANGES` × `UPGRADES_BY_QUALITY` mais n'existe pas
en tant que constante exposée → impossible de comparer une rune à son "max par rareté".

---

### `types/src/artifact-data.ts` — 68 lignes (⚠️ INCOMPLET)

| Constant                       | Statut         | Notes                                         |
| ------------------------------ | -------------- | --------------------------------------------- |
| `ARTIFACT_MAIN_STAT_MAX`       | ⚠️ TODO verify | atk: 100, def: 100, hp: 1500                  |
| `ARTIFACT_SUBSTAT_NAMES`       | ✅ OK          | 36 types nommés                               |
| `ARTIFACT_SUBSTATS_BY_QUALITY` | ✅ OK          | 0→4 selon rareté                              |
| Roll ranges par substat        | ❌ ABSENT      | Valeurs min/max par roll inexistantes         |
| Roll count max par rareté      | ❌ ABSENT      | Combien de rolls par substat max selon rareté |
| Conversion (gem artifact)      | ❌ ABSENT      | Les artifacts peuvent-ils être convertis ?    |
| Tier lists par substat         | ❌ ABSENT      | S/A/B/C/D par catégorie de substat            |
| Classification QUAD/TRIPLE     | ❌ ABSENT      | Seuil pour proc identity vs synergy identity  |

**Conséquence** : `artifact-efficiency.ts` hardcode les max values dedans au lieu d'importer depuis les constants → duplication + difficulté de maintenance.

---

### `api/src/analyzers/rune-efficiency.ts` — 1 664 lignes

| Feature                          | Statut           | Notes                                                              |
| -------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Barion formula                   | ✅ Implémenté    | Calcul roll quality, efficiency %                                  |
| Grind potential                  | ✅ Implémenté    | Après grind legend max                                             |
| Gem target detection             | ✅ Partiel       | Identifie la stat à gemmer                                         |
| Progressive advice               | ✅ Implémenté    | sell/keep/grind/upgrade par niveau                                 |
| Synergy archetypes               | ✅ 14 archetypes | Weighted efficiency par archetype                                  |
| **TRUE LEG MIN / TRUE HERO MIN** | ❌ ABSENT        | Système de classification cible non implémenté                     |
| **Rarity-relative comparison**   | ❌ ABSENT        | Pas de "est-ce above Hero max?"                                    |
| **Pre-gem classification**       | ❌ ABSENT        | L'analyse est sur l'état actuel, pas post-gem                      |
| **Slot DEF constraint**          | ⚠️ Partiel       | Slot 1 = no DEF main, mais gem suggestions doivent en tenir compte |

---

### `api/src/analyzers/artifact-efficiency.ts` — ~500 lignes

| Feature                               | Statut        | Notes                                                  |
| ------------------------------------- | ------------- | ------------------------------------------------------ |
| Tier S/A/B/C/D                        | ✅ Implémenté | Score 0-100 → tier                                     |
| Substat quality                       | ✅ Partiel    | Max values hardcodées dedans                           |
| **QUAD classification**               | ❌ ABSENT     | Aucune détection de quad proc                          |
| **TRIPLE classification**             | ❌ ABSENT     | Aucune détection de triple proc                        |
| **NUKER / BRUISER / SUPPORT**         | ⚠️ Partiel    | Logique archetype existe mais pas le système documenté |
| **CONVERT detection**                 | ❌ ABSENT     | Pas de "good base + 1 weak line → CONVERT"             |
| **Proc identity vs synergy identity** | ❌ ABSENT     | Rule 1 et Rule 2 du document non implémentées          |

---

## 2. Gaps critiques : Rune Analysis

### GAP-RUNE-001 — `MAX_STAT_PER_RARITY` manquant 🔴 P0

**Problème** : On ne peut pas savoir si une valeur de stat est "above Hero max" ou "above Rare max"
sans calculer manuellement. La simulation "Hero max perfect vs Legend actuel" est impossible.

**Exemple concret** :

```
Rune Slot 1 Legend: 27 SPD
- SPD max per roll: 6 (from SUBSTAT_ROLL_RANGES)
- Hero rolls: 1 base + 3 upgrades = 4 rolls max
- Hero max SPD: 4 × 6 = 24
- Legend rolls: 1 base + 4 upgrades = 5 rolls max
- Legend max SPD: 5 × 6 = 30

→ 27 SPD > Hero max (24) = genuinement Legend-tier
→ 27 SPD < Legend max (30) = pas le maximum absolu
```

**Solution** : Exposer une constante calculée `MAX_STAT_BY_RARITY` dans `rune-data.ts`.

**Formule** :

```typescript
// Pour chaque stat et chaque rareté :
// max_rolls = UPGRADES_BY_QUALITY[quality] + 1  (base + upgrades)
// BUT: pour hero, le premier upgrade crée une nouvelle substat (si la stat n'était pas initiale)
// SAFE: compter base(1) + upgrades(3 pour hero, 4 pour legend)
// max_value = max_rolls × SUBSTAT_ROLL_RANGES[stat].max
MAX_STAT_BY_RARITY[rarity][stat] = (1 + UPGRADES_BY_QUALITY[rarity]) × SUBSTAT_ROLL_RANGES[stat].max
```

---

### GAP-RUNE-002 — Classification TRUE LEG MIN / TRUE HERO MIN absente 🔴 P0

**Problème** : Le système actuel retourne `EfficiencyTier ('sell'|'keep'|'good'|'great'|'godlike')`,
qui est un score relatif au profil joueur. Il ne permet pas de savoir si une rune est
"genuinement Legend-tier" ou "Hero déguisé en Legend".

**Système cible** :

```
TRUE LEG MIN   → dépasse le theoretical max d'une Hero parfaite
TRUE HERO MIN  → dépasse le theoretical max d'une Rare parfaite
TRUE RARE MIN  → dépasse le theoretical max d'une rareté inférieure
REAPP          → slot/set/innate premium, potentiel futur élevé
SELL           → ne passe pas TRUE RARE MIN
GEM            → structure valide mais 1 stat morte à gemmer
GRIND          → structure valide, attente grind
TEST           → évaluation en cours
```

**Logique de classification** :

```
1. Calculer le "theoretical max" d'une Hero parfaite = MAX_STAT_BY_RARITY['hero'] pour les 4 meilleures stats
2. Calculer le "theoretical max" d'une Rare parfaite = idem pour rare
3. Comparer la rune (post-gem simulé si applicable) à ces théoriques
4. Si rune > Hero max → TRUE LEG MIN
5. Si rune > Rare max → TRUE HERO MIN
6. Sinon → TRUE RARE MIN ou SELL selon structure
```

---

### GAP-RUNE-003 — Simulation pré-gem absente 🟠 P1

**Problème** : L'analyse classifie la rune dans son état ACTUEL. Si le critdmg va être gémmé,
la classification doit prendre en compte l'état POST-GEM.

**Exemple** :

```
Slot 1 Legend: 8% ATK / 4% critdmg / 27 SPD / 5% HP
État actuel: critdmg est une dead stat (slot 1 optimisé pour grindables)
Post-gem simulé (critdmg → ATK% ou DEF%): 4 grindables → TRUE LEG MIN
```

**Besoin** :

- `simulateGem(runeData, targetStat): SimulatedRuneData` — retourne l'état post-gem
- `analyzeWithGemSimulation(runeData): { current: RuneAnalysis, postGem: RuneAnalysis, gemTarget: StatType }`

---

### GAP-RUNE-004 — Contrainte slot ignorée dans gem suggestions 🟠 P1

**Problème** : Le système suggère parfois de gemmer vers DEF sur slot 1, mais slot 1 main = ATK flat.
La substat DEF est techniquement possible sur slot 1, mais la suggestion devrait tenir compte
du contexte (slot 1 n'a pas DEF main → gemmer en ATK% ou SPD est préférable).

**Règle à implémenter** :

```typescript
const GEM_PRIORITY_BY_SLOT: Record<RuneSlot, StatType[]> = {
  1: ['spd', 'atk%', 'cr', 'cd'], // no DEF main → ATK stats priority
  2: ['spd', 'atk%', 'def%', 'hp%'],
  3: ['spd', 'def%', 'hp%', 'atk%'], // DEF slot
  4: ['cr', 'cd', 'atk%', 'spd'], // CRIT slot
  5: ['spd', 'hp%', 'def%', 'atk%'],
  6: ['spd', 'hp%', 'def%', 'acc'],
}
```

---

### GAP-RUNE-005 — Inconsistance RuneSet vs SET_STAT_TIERS 🟡 P2

**Problème** : `SET_STAT_TIERS` inclut `seal` et `intangible` mais ils ne sont pas dans
le type `RuneSet` ni dans `RUNE_SET_INFO`.

**Fix** : Soit ajouter seal/intangible au type RuneSet, soit les retirer de SET_STAT_TIERS.

---

### GAP-RUNE-006 — Ancient flat stats non vérifiés 🟡 P2

**Problème** : `ANCIENT_SUBSTAT_BASE_RANGES` pour hp, atk, def plats = TODO verify in-game.

**Action** : Vérification in-game + mettre à jour les valeurs + supprimer les TODO.

---

## 3. Gaps critiques : Artifact Analysis

### GAP-ART-001 — Roll ranges artifacts absents 🔴 P0

**Problème** : `artifact-data.ts` ne contient pas les ranges min/max par roll pour chaque substat.
Ces valeurs sont hardcodées dans `artifact-efficiency.ts` (SUBSTAT_MAX_VALUES).

**Solution** : Déplacer vers `artifact-data.ts` :

```typescript
export const ARTIFACT_SUBSTAT_ROLL_RANGES: Record<
  ArtifactSubstatType,
  { min: number; max: number }
> = {
  'dmg-to-fire': { min: 1, max: 4 }, // % elemental DMG
  'dmg-from-fire': { min: 1, max: 4 }, // % elemental reduction
  'skill1-cd': { min: 1, max: 1 }, // turns (integer)
  'skill1-recovery': { min: 1, max: 4 },
  'skill1-accuracy': { min: 2, max: 5 },
  'additional-dmg-by-hp': { min: 1, max: 4 },
  'additional-dmg-by-spd': { min: 1, max: 4 },
  'recovery-hp': { min: 1, max: 4 },
  'spd-under-hp-threshold': { min: 2, max: 8 }, // flat SPD
  // ... tous les 36 types
}
```

**Note** : Vérification in-game requise pour confirmer tous les min/max. Actuellement les max
sont documentés mais les min ne le sont pas.

---

### GAP-ART-002 — Classification QUAD/TRIPLE absente 🔴 P0

**Problème** : L'analyseur ne détecte pas si un artifact a un triple ou quad proc sur une même stat.
C'est la première priorité du système de classification cible.

**Logique** :

```typescript
// Compter les rolls par substat
const rollsBySubstat = substats.reduce((acc, sub) => {
  acc[sub.type] = (acc[sub.type] || 0) + sub.rolls
  return acc
}, {})

// Détection
if (Object.values(rollsBySubstat).some(rolls => rolls >= 4)) → QUAD
if (Object.values(rollsBySubstat).some(rolls => rolls >= 3)) → TRIPLE
// Sinon → évaluation par synergy identity
```

---

### GAP-ART-003 — Marker system NUKER/BRUISER/SUPPORT non structuré 🟠 P1

**Problème** : `artifact-efficiency.ts` a une logique partielle d'archetype mais pas le système
documenté avec S Tier / A Tier / Weak lines par catégorie.

**Besoin** : Implémenter dans `artifact-data.ts` :

```typescript
export const ARTIFACT_ARCHETYPE_TIERS: Record<ArtifactArchetype, {
  S: ArtifactSubstatType[],
  A: ArtifactSubstatType[],
  weak: ArtifactSubstatType[]
}> = {
  NUKER: {
    S: ['crit-dmg-single', 'crit-dmg-aoe', 'skill3-cd', 'skill2-cd', ...],
    A: ['additional-dmg-by-atk', 'additional-dmg-by-spd', ...],
    weak: ['dmg-reduction-single', 'shield', 'recovery-ally', ...]
  },
  BRUISER: {
    S: ['additional-dmg-by-hp', 'additional-dmg-by-def', 'recovery-hp', ...],
    A: ['additional-dmg-by-spd', 'crit-dmg-single', ...],
    weak: ['bomb-dmg', ...]
  },
  SUPPORT: {
    S: ['recovery-hp', 'dmg-from-fire', 'skill1-accuracy', 'shield', ...],
    A: ['additional-dmg-by-spd', 'skill1-recovery', ...],
    weak: ['bomb-dmg', 'crit-dmg-single', ...]
  }
}
```

---

### GAP-ART-004 — CONVERT detection absente 🟠 P1

**Problème** : Pas de détection "bonne base + 1 ligne faible → CONVERT".

**Logique** :

```
Si artifact a 3 bonnes lignes (S/A tier) + 1 ligne faible (weak tier) → CONVERT
Si artifact a 2 bonnes lignes + 2 lignes faibles → évaluer selon proc concentration
```

---

### GAP-ART-005 — Main stat max non vérifiés 🟡 P2

**Problème** : `ARTIFACT_MAIN_STAT_MAX = { atk: 100, def: 100, hp: 1500 }` avec "TODO: verify".

**Action** : Vérification in-game + supprimer les TODO.

---

### GAP-ART-006 — Artwork type icons manquants 🟢 P3

**Problème** : `summoners-war.ts` note "No artifact type icons found", utilise des text fallbacks.

**Action** : Chercher assets communautaires ou créer des icônes SVG simples pour ATK/DEF/HP/SUP.

---

## 4. Backlog par ordre de priorité

### Phase 1 — Foundation data (🔴 P0)

- [ ] **DATA-001** — Ajouter `MAX_STAT_BY_RARITY` dans `rune-data.ts`
  - Calculé depuis `SUBSTAT_ROLL_RANGES × (1 + UPGRADES_BY_QUALITY)`
  - Exposer comme constante pour éviter le recalcul
  - Écrire tests unitaires

- [ ] **DATA-002** — Déplacer `SUBSTAT_MAX_VALUES` de `artifact-efficiency.ts` vers `artifact-data.ts`
  - Ajouter les min aussi (actuellement absents)
  - Vérifier in-game les valeurs

- [ ] **DATA-003** — Ajouter `ARTIFACT_SUBSTAT_ROLL_RANGES` dans `artifact-data.ts`
  - Compléter avec min et max par type de substat

### Phase 2 — Rune classification system (🟠 P1)

- [ ] **RUNE-001** — Implémenter la classification TRUE LEG MIN / TRUE HERO MIN / TRUE RARE MIN
  - Nouvelle fonction `classifyRuneMarker(runeData): RuneMarker`
  - Enum `RuneMarker = 'TRUE_LEG_MIN' | 'TRUE_HERO_MIN' | 'TRUE_RARE_MIN' | 'REAPP' | 'SELL' | 'GEM' | 'GRIND' | 'TEST'`
  - Utilise `MAX_STAT_BY_RARITY` pour comparaisons cross-rareté
  - Compatible avec l'ancien système (retourner aussi `EfficiencyTier` pour la transition)

- [ ] **RUNE-002** — Implémenter simulation pré-gem
  - `simulateGem(runeData, targetStat): RuneData`
  - `getBestGemTarget(runeData): StatType` — stat la moins utile à remplacer
  - `analyzeWithGemSimulation(runeData): RuneAnalysisWithGem`

- [ ] **RUNE-003** — Ajouter `GEM_PRIORITY_BY_SLOT` dans `rune-data.ts`
  - Contraintes par slot pour les suggestions de gem
  - Slot 1 = no DEF main → ne pas suggérer DEF comme gem si meilleure option disponible

### Phase 3 — Artifact classification system (🟠 P1)

- [ ] **ART-001** — Implémenter QUAD / TRIPLE detection dans `artifact-efficiency.ts`
  - Compter les rolls par substat type
  - Retourner `procConcentration: { type: ArtifactSubstatType, rolls: number }[]`
  - Classifier QUAD si rolls ≥ 4 sur une même stat, TRIPLE si ≥ 3

- [ ] **ART-002** — Ajouter `ARTIFACT_ARCHETYPE_TIERS` dans `artifact-data.ts`
  - S / A / weak lines pour NUKER, BRUISER, SUPPORT
  - Basé sur le document de classification fourni

- [ ] **ART-003** — Implémenter marker system artifact
  - `ArtifactMarker = 'QUAD' | 'TRIPLE' | 'NUKER' | 'BRUISER' | 'SUPPORT' | 'CONVERT' | 'TEST' | 'SELL'`
  - Rule 1: si QUAD/TRIPLE utile → proc identity prend priorité
  - Rule 2: sinon → synergy identity (NUKER/BRUISER/SUPPORT)
  - Rule 3: Additional DMG lines ne sont pas auto-NUKER (dépend de l'archétype du monstre)

- [ ] **ART-004** — CONVERT detection
  - 3 bonnes lignes (S/A) + 1 faible → CONVERT
  - Afficher quelle ligne convertir

### Phase 4 — Data fixes (🟡 P2)

- [ ] **DATA-004** — Vérifier ancient flat stat ranges in-game et supprimer TODO
  - `hp: { min: 160, max: 400 }`
  - `atk: { min: 12, max: 22 }`
  - `def: { min: 12, max: 22 }`

- [ ] **DATA-005** — Aligner `RuneSet` type avec `SET_STAT_TIERS`
  - Option A: ajouter `seal` et `intangible` à `RuneSet`
  - Option B: retirer seal/intangible de `SET_STAT_TIERS`
  - Clarifier si ces sets existent en jeu

- [ ] **DATA-006** — Vérifier et corriger `ARTIFACT_MAIN_STAT_MAX`
  - atk: 100, def: 100, hp: 1500 — confirmer en jeu

### Phase 5 — Polish (🟢 P3)

- [ ] **UI-001** — Afficher le RuneMarker (TRUE LEG MIN etc.) dans `rune-card.tsx`
- [ ] **UI-002** — Afficher le ArtifactMarker (QUAD/NUKER etc.) dans `gear-card.tsx`
- [ ] **UI-003** — Mode "comparaison rareté" — "cette rune vaut combien pour un Hero ?"
- [ ] **DATA-007** — Artifact type icons (ATK/DEF/HP/SUP)

---

## 5. Simulation rune : comment implémenter

### Problème résolu

La question "si le Hero a max en speed et max en hp, est-ce que le ratio serait pareil ?" se traduit par :

```typescript
// Comparer une Legend actuelle à une Hero hypothétique parfaite
function compareToHeroMax(runeData: RuneData): RarityComparison {
  const heroMaxStats = computeMaxStats('hero') // { spd: 24, hp%: 32, ... }
  const legendMaxStats = computeMaxStats('legend') // { spd: 30, hp%: 40, ... }

  for (const sub of runeData.subStats) {
    const heroMax = heroMaxStats[sub.type]
    const legendMax = legendMaxStats[sub.type]

    if (sub.value > heroMax) {
      // Cette stat est genuinement Legend-tier (impossible sur Hero)
    } else if (sub.value === heroMax) {
      // Parfait sur Hero aussi
    } else {
      // Valeur atteignable sur Hero (mais combien de rolls ?)
      const heroRollQuality = sub.value / heroMax // ratio relatif à Hero max
      const legendRollQuality = sub.value / legendMax // ratio relatif à Legend max
      // heroRollQuality > legendRollQuality → la stat "paraît meilleure" comparée à Hero max
    }
  }
}
```

### Exemple concret avec ta rune

```
Slot 1 Legend: 8% ATK / 4% critdmg / 27 SPD / 5% HP
(post-gem : critdmg → ATK% simulé, donc 8% ATK + 8% ATK gem / 27 SPD / 5% HP)

SPD:
  Legend max: (1+4) × 6 = 30
  Hero max:   (1+3) × 6 = 24
  Valeur:     27
  → 27 > 24 (Hero max) → GENUINEMENT LEGEND-TIER ✓
  → Ratio vs Legend: 27/30 = 90% → très bon
  → Ratio vs Hero: N/A (impossible)

HP%:
  Legend max: (1+4) × 8 = 40%
  Hero max:   (1+3) × 8 = 32%
  Valeur:     5%
  → 5% < 24 (Hero max) → base minimale, 0 rolls upgrades
  → Ratio vs Legend: 5/40 = 12.5% → terrible
  → Mais grindable → ATK% post grind = 5+10 = 15% avec legend grind max

ATK%:
  Valeur:     8%
  → Max per roll: 8 → 8% = 1 roll parfait
  → Hero max: (1+3) × 8 = 32%
  → Ratio: 8/32 = 25% → 1 seul roll, loin du max

Conclusion:
  - Seul SPD est genuinement Legend-tier (au-dessus du Hero max)
  - HP% et ATK% sont atteignables sur Hero (valeurs basses)
  - Mais structure après gem = 4 grindables → potentiel élevé post-grind
  → Classification: TRUE LEG MIN (grâce au 27 SPD above Hero max + 4 grindables)
```

---

## 6. Fichiers à créer / modifier

| Fichier                                     | Action   | Contenu                                                                 |
| ------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `types/src/rune-data.ts`                    | Modifier | Ajouter `MAX_STAT_BY_RARITY`, `GEM_PRIORITY_BY_SLOT`                    |
| `types/src/artifact-data.ts`                | Modifier | Ajouter `ARTIFACT_SUBSTAT_ROLL_RANGES`, `ARTIFACT_ARCHETYPE_TIERS`      |
| `types/src/rune.ts`                         | Modifier | Ajouter `RuneMarker` type                                               |
| `types/src/artifact.ts`                     | Modifier | Ajouter `ArtifactMarker` type, `ArtifactArchetype`                      |
| `api/src/analyzers/rune-efficiency.ts`      | Modifier | Ajouter `classifyRuneMarker()`, `simulateGem()`, `compareToRarityMax()` |
| `api/src/analyzers/artifact-efficiency.ts`  | Modifier | Ajouter QUAD/TRIPLE detection, marker system                            |
| `api/src/analyzers/rune-efficiency.test.ts` | Modifier | Tests pour nouveau système de classification                            |

---

## 7. Ordre d'implémentation recommandé

```
Phase 1 (DATA)
  → DATA-001: MAX_STAT_BY_RARITY
  → DATA-002 + DATA-003: artifact roll ranges dans constants

Phase 2 (RUNE)
  → RUNE-001: classification marker system
  → RUNE-002: simulation pré-gem
  → RUNE-003: gem priority by slot

Phase 3 (ARTIFACT)
  → ART-001: QUAD/TRIPLE detection
  → ART-002: archetype tiers
  → ART-003: marker system

Phase 4 (UI)
  → UI-001: afficher markers dans rune-card
  → UI-002: afficher markers dans gear-card
```

---

_Créé le 2026-05-10 — Claude Code session_
