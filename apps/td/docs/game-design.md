# 🎮 Tower Defense PvP - Game Design Document (V1)

## 🧠 Inspirations

- **Battlegrounds** (auto-battler, shop RNG)
- **Warcraft III TDs** (placement libre, pathing)
- **Legion TD / Element TD** (PvP via envoi d’unités)

## 🔁 Core Gameplay Loop 

Toute les actions sont faisables à n'importe quel moment, mais certaines n'ont d'effet que lors de la loop suivante.

1. **Taverne (achat)**

   - Shop aléatoire type **Battlegrounds** : x tours + unités aléatoires disponibles
   - Achat de tours pour les placer sur le terrain à n'importe quelle moment de la loop tant que l'espace de placement est libre
   - Achat d’unités pour immédiatement augmenter le pull des unités envoyé lors de la prochaine loop et augmenter son propre income

2. **Placement**

   - Placement libre des tours entre un point d’entrée et de sortie fixes
   - Le pathing est généré automatiquement et recalculer lors de la pose d'une nouvelle tour (A\*)

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
