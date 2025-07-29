# 🎮 Tower Defense PvP - Game Design Document (MVP)

## Pitch & Vision

Un **TD multijoueur à [8] joueurs**, mais en version **Tower Defense PvP dynamique** :

- Chaque joueur **ach猫te des tours et des unit茅s** depuis un **shop RNG**.
- Toutes les **30 secondes**, une **roue globale** tourne et envoie automatiquement les unit茅s achet茅es chez un joueur **al茅atoire**.
- **Combat permanent**, aucune phase de pause : tu d茅fends tout en achetant.
- **Vision dynamique** : tes unit茅s r茅v猫lent temporairement la d茅fense adverse 鈫� fragments persistants.
- **Late game = duel direct** 鈫� plus de hasard, full skill.
- **Dernier survivant gagne**.

[**鈫� Voir alternatives non retenues sur le flow global**](./not-retained/global-flow-variants.md)

---
## 🧠 Inspirations

- **Battlegrounds** (auto-battler, shop RNG)
- **Warcraft III TDs / Legion TD / Element TD** (placement libre, pathing, PvP via envoi d’unités) 
  - pros: 
  - cons: safe spots et effet domino punitif 

## 🔁 Core Gameplay Loop 

Toute les actions sont faisables à n'importe quel moment, mais certaines n'ont d'effet que lors de la loop suivante.

1. **Taverne (achat)**

   - Shop aléatoire type **Battlegrounds** : x tours + unités aléatoires disponibles
   - Achat de tours pour les placer sur le terrain à n'importe quelle moment de la loop tant que l'espace de placement est libre
   - Achat d’unités pour immédiatement augmenter le pull des unités envoyé lors de la prochaine loop et augmenter son propre income

2. **Placement**

   - Placement libre des tours entre un point d’entrée et de sortie fixes
   - Le pathing est généré automatiquement et recalculer lors de la pose d'une nouvelle tour

3. **Combat**

   - Les unités ennemies arrivent
   - Les tours tentent de les tuer
   - Chaque unité qui passe = perte de HP
   - Chaque kill = instant gold gain

4. **Fin de loop**
   - Gain de gold (income)
   - Nouveau shop
   - Vague suivante part

## 🏁 Conditions de victoire

- Si HP = 0 → élimination
- Last man standing gagne

## ⚔️ PvP et économie

- Envoyer des unités chez le voisin direct / un joueur aléatoire / un duel aléatoire / tout le monde soit y compris
- Tu dépenses de l’or pour des unités→ tu gagnes +income mais affaiblis ta défense
- Gold par kill est fixe / income augmente à chaque round

## 🔄 Rejouabilité

- Shop RNG → aucune partie identique
- Pathing dynamique par placement
- Ennemis variés envoyés par les joueurs




















# 馃幃 TD Battleground 鈥� 



## 馃彈锔� Flow Global

- **Ticks toutes les 30s (cycle fixe)** :
  1. Achat 鈫� mobs visibles dans la roue globale
  2. Roulette tourne 鈫� attribution random des mobs 鈫� spawn
  3. Combat 鈫� vision/scouting via aura des unit茅s
  4. Income distribu茅 + shop RNG refresh 鈫� nouveau cycle

- **Combat permanent :**
  - Les vagues ne s鈥檃rr锚tent jamais, elles peuvent se superposer.
  - Si un mob traverse 鈫� perte de HP.
  - Si les mobs survivent 鈫� ils continuent mais **affaiblis** chez un autre joueur (et disparaissent apr猫s un tour complet).

- **Progression d鈥檜ne partie :**
  - **Early (8鈫�6 joueurs)** 鈫� full roulette impr茅visible, objectif income + premiers scouts.
  - **Mid (6鈫�4 joueurs)** 鈫� roulette plus cibl茅e + vision accumul茅e 鈫� adaptation progressive.
  - **Late (4鈫�3 joueurs)** 鈫� quasi plus de hasard, mobs plus puissants, shop RNG late game.
  - **Finale (2 joueurs)** 鈫� duel direct 1v1, full skill, exploitation totale des failles vues.

鉁� **Version actuelle retenue**
- Roulette globale early/mid
- Duel direct finale

鉂� **Autres propositions**
- [Cha卯ne Legion TD (voisin pr茅c茅dent/suivant)](./not-retained/legion-chain.md)
- [Full duels auto-battler 脿 chaque round](./not-retained/full-duels-every-round.md)

---

## 鉁� M茅caniques valid茅es

- **Roulette globale** tant qu鈥檌l reste 鈮�3 joueurs :
  - Supprime les safe spots
  - Ajoute du mindgame (tu vois les mobs en attente mais pas la cible)

- **Combat permanent + ticks fixes :**
  - Pas de downtime comme TFT
  - Tout le monde joue en m锚me temps

- **Vision dynamique (brouillard de guerre) :**
  - Tes unit茅s r茅v猫lent la lane adverse avec une **aura de vision**
  - Les fragments restent mais peuvent devenir obsol猫tes

- **Mob scaling par vari茅t茅 (pas auto HP+):**
  - Trash mobs income
  - Tanks protecteurs
  - Sp茅ciaux (volants, aura, invisibles, siege)
  - Boss late game

- **Mobs qui passent continuent affaiblis**, puis disparaissent apr猫s un tour complet.

- **Finale 1v1 skill pur :**
  - Plus de roulette, tous les envois vont sur l鈥檃utre joueur
  - Exploitation totale des failles scouted

鉁� **Version actuelle retenue**
- Vision dynamique + fragments persistants

鉂� **Autres propositions**
- [Vision globale permanente (gratuite)](./not-retained/global-vision.md)

---

## 鈴� Timeline d鈥檜ne partie (8 joueurs)

- **0-120s (4 ticks)** 鈫� Early  
  - Roulette globale = impr茅visible
  - Trash mobs income + premiers scouts
  - 2 joueurs out

- **120-300s (~6 ticks)** 鈫� Mid-game  
  - Roulette encore active mais + cibl茅e (moins de lanes)
  - Vision accumul茅e 鈫� adaptation partielle
  - (Optionnel) Mini-duels al茅atoires 鈫� scouts directs
  - 2 joueurs out

- **300-420s (~4 ticks)** 鈫� Late-game  
  - Roulette tendue, boss/sp茅ciaux apparaissent
  - Info exploitable sur survivants
  - 1 joueur out

- **420s+ (~2-3 ticks)** 鈫� Finale  
  - Duel direct
  - Full skill, adaptation ultime
  - WINNER

鉁� **Version actuelle retenue**
- Format Battleground 8 joueurs 鈫� 6 鈫� 4 鈫� 3 鈫� finale 2 joueurs

鉂� **Autres propositions**
- [Scaling automatique des mobs par HP/d茅g芒ts](./not-retained/auto-scaling-mobs.md)

---

## 馃幃 Exemple d鈥檜n cycle (30s)

1. **Phase Achat (0-30s)**
   - Tous les joueurs ach猫tent des tours/mobs
   - Les mobs achet茅s visibles dans la roue globale
   - Mais on ne sait pas chez qui ils iront

2. **Tick T30s**
   - Roulette tourne 鈫� attribution random
   - Spawn mobs sur les lanes 鈫� combat
   - Income distribu茅 + shop refresh

3. **Combat & vision**
   - Les mobs traversent 鈫� r茅v猫lent une partie de la lane adverse
   - Fragments persistants 鈫� mais peuvent 锚tre obsol猫tes

4. **Adaptation**
   - Tu choisis ta prochaine compo en fonction des failles scouted
   - Nouveau cycle 鈫� pression continue

---

## 馃懢 Cat茅gories d鈥檜nit茅s (shop RNG)

**Early**
- Goblin (trash income)
- Wolf (tank l茅ger)
- Bat volant (ignore pathing)
- Archer Tower, Bomb Tower

**Mid**
- Orc (HP+ income)
- Aura Shaman (buff autres mobs)
- Wyvern volant rapide
- Anti-air Tower, Splash Tower

**Late**
- Siege Golem (casse une tour)
- Phantom (invisible sauf anti-stealth)
- Boss Demon (茅norme HP, 10 HP si passe)
- Specialized towers (anti-stealth, anti-boss)

鉁� **Version actuelle retenue**
- Shop RNG progressif : early/mid/late avec r么les vari茅s

鉂� **Autres propositions**
- [Auto-scaling simple sans RNG](./not-retained/auto-scaling-mobs.md)

---

## 馃挕 Raisons des choix

- **Roulette globale** 鈫� 茅vite les safe spots, garde l鈥檌mpr茅visibilit茅.
- **Combat permanent** 鈫� pas de downtime comme TFT, tout le monde sous pression.
- **Vision dynamique** 鈫� incertitude early, info skill茅e en late 鈫� progression naturelle.
- **Finale 1v1** 鈫� payoff strat茅gique des choix & vision accumul茅e.
- **Dur茅e courte (~10 min)** 鈫� m锚me tempo qu鈥檜n Battleground, parfait pour multijoueur comp茅titif.

[**鈫� Voir les raisons pour les concepts non retenus**](./not-retained/reasons-index.md)

---

## 鉂� Points ouverts (脿 d茅cider plus tard)

- Tick = 30s ou 40s ?  
- Mini-duels midgame obligatoires ou optionnels ?  
- Nombre max d鈥檜nit茅s par vague pour 茅viter surcharge ?  
- Income scaling : int茅r锚t fixe par tranche d鈥檕r (Legion TD) ou pas ?  

---

## 馃搨 Liens vers concepts archiv茅s

- [Cha卯ne Legion TD classique](./not-retained/legion-chain.md)
- [Full duels auto-battler](./not-retained/full-duels-every-round.md)
- [Scaling automatique des mobs](./not-retained/auto-scaling-mobs.md)
- [Vision globale permanente](./not-retained/global-vision.md)

---










# ❌ Concept non retenu – Full duels auto-battler à chaque round

## Description
Chaque tick, tous les joueurs sont **matchés en duel 1v1** comme dans TFT.
Les mobs ne passaient jamais chez un autre joueur, juste duel direct.

## Pourquoi ça avait du sens
- Facile à comprendre pour les joueurs venant de TFT
- Vision claire sur un adversaire → adaptation immédiate

## Pourquoi rejeté
- Trop “Battleground pur”, moins Tower Defense
- Moins de chaos PvP → perdait l’identité “roulette globale”
- Créait des attentes figées (toujours même rythme duel)

## Réactivation possible
✅ Peut être réutilisé en **mode alternatif** (mode Duel Only)
✅ Peut être mixé en **mini-duels midgame aléatoires**






# ❌ Concept non retenu – Vision globale permanente

## Description
Tous les joueurs voyaient **en permanence** la défense des autres.

## Pourquoi ça avait du sens
- Infos complètes → décisions plus rationnelles
- Pas besoin de scout → moins de complexité

## Pourquoi rejeté
- Supprimait l’incertitude → moins de mindgame
- Tu pouvais full target facilement → moins fun early/mid
- Enlevait le rôle stratégique des scouts

## Réactivation possible
✅ Peut être activée en **mode spectateur**
✅ Peut être donnée en bonus via **unités de reconnaissance spéciales**











# ❌ Concept non retenu – Chaîne Legion TD (voisin suivant)

## Description
Chaque joueur envoie ses mobs au **voisin suivant**, et les mobs qui passent continuent chez le suivant, etc.

## Pourquoi ça avait du sens
- Crée une chaîne de pression PvP continue
- Si un joueur est faible → il contamine le suivant

## Pourquoi rejeté
- Créait des **safe spots** si tu es entouré de deux joueurs faibles
- Un joueur faible pouvait **détruire la partie** pour tout le monde
- Moins de tension globale

## Réactivation possible
✅ Peut être réexploré dans un mode **2v2 ou coop**
✅ Ou en **mode “chaîne infinie” pour une variante fun**






# ❌ Concept non retenu – Auto-scaling des mobs (HP/dégâts only)

## Description
Les mobs devenaient automatiquement plus forts (HP/dégâts) à chaque tick.

## Pourquoi ça avait du sens
- Facile à implémenter
- Progression linéaire simple à comprendre

## Pourquoi rejeté
- Trop linéaire → peu de profondeur stratégique
- Supprimait la diversité (trash vs tank vs spéciaux)
- Pas de vrai mindgame sur les envois

## Réactivation possible
✅ Peut être utilisé en **PvE neutre** pour mettre une pression globale
✅ Peut compléter le shop RNG (buff progressif des mêmes unités)