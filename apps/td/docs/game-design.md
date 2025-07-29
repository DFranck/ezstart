# 🎮 Tower Defense PvP - Game Design Document (V1)

## 🧠 Inspirations

- **Battlegrounds** (auto-battler, shop RNG)
- **Warcraft III TDs** (placement libre, pathing)
- **Legion TD / Element TD** (PvP via envoi d’unités)

## 🔁 Core Gameplay Loop

1. **Phase de Taverne (achat)**

   - Shop aléatoire type **Battlegrounds** : x tours/unités aléatoires disponibles
   - Achat de tours placeable sur son terrain
   -
   - Achat de tours + achat d’unités PvP type **Legion TD / Element TD** à envoyer chez les adversaire et augmenter notre income

2. **Phase de Placement**

   - Placement libre des tours type **Warcraft III TDs** entre un point d’entrée et de sortie fixes
   - Le pathing est généré automatiquement (A\*)

3. **Phase de Combat**

   - Les unités ennemies arrivent
   - Les tours tentent de les tuer
   - Chaque unité qui passe = perte de HP
   - Chaque kill = instant gold gain

4. **Fin de round**
   - Gain de gold (income)
   - Nouveau shop
   - Vague suivante plus forte

## 🏁 Conditions de victoire

- Si HP = 0 → élimination
- Last man standing gagne

## ⚔️ PvP et économie

- Envoyer des unités chez le voisin direct / un joueur aléatoire / un duel aléatoire / tout le monde soit y compris
- Tu dépenses de l’or → tu gagnes +income mais affaiblis ta défense
- Gold par kill est fixe / income augmente à chaque round

## 🔄 Rejouabilité

- Shop RNG → aucune partie identique
- Pathing dynamique par placement
- Ennemis variés envoyés par les joueurs
