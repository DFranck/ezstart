# 🎮 Tower Defense PvP - Game Design Document (MVP)

### 🗂️ Légende des annotations

- ⚠️ À définir / à discuter
- 🚧 Placeholder incomplet
- 🤔 Idée ouverte ou incertaine
- ✅ Confirmé ou validé

---

## 🎯 Pitch & Vision

Un **Tower Defense PvP dynamique à ⚠️ 8 joueurs** :

- Chaque joueur **achète des tours et des unités** dans un **shop RNG (Random Number Generator)**.
- Toutes les ⚠️ 30 secondes, les unités achetées sont envoyées.
- Aucune phase figée : tu **défends, attaques, places, achètes** en temps réel.

---

## 🧠 Inspirations

- **Battlegrounds** (shop RNG, synergies, roulements)
- **Warcraft III TD / Legion TD** (placement libre, pathing, envoi PvP)

---

## 🔁 Boucle de jeu (loop permanente)

> Toutes les actions sont disponibles à tout moment, mais certaines prennent effet lors de la prochaine boucle.

### 1. Taverne (Shop RNG)

- Shop avec **tours** et **unités** aléatoires
  🤔 Les tours peuvent être stockées en main temporairement (max X ?) pour affiner le pathing ou les synergies.
- ⚠️ Unit buy = envoi auto dans la prochaine loop
- ⚠️ Tour buy = va dans ta "main", pose possible à tout moment.

### 2. Placement (Pathing dynamique)

- Placement libre sur la carte (spawn ➝ exit)
- Le path est recalculé à chaque tour posée
- Objectif : rallonger le chemin + optimiser les DPS

### 3. Combat (temps réel)

- Les unités de l’adversaire arrivent en flux continu
- Chaque unité tuée = gold immédiat
- Chaque unité qui passe = perte de HP

### 4. Tick suivant

- Nouveau shop RNG
- Gain de gold passif basé sur l’income
- Lancement automatique de la prochaine vague

---

## 🏁 Conditions de victoire

- ⚰️ HP = 0 → éliminé
- 🏆 Dernier joueur en vie → victoire

---

## 🔄 Rejouabilité

- Shop RNG = aucune partie identique
- Pathing à géométrie variable
- Envois adverses changeants → adaptation constante

---

## ⚔️ Mécaniques PvP

### Envoi d’unités

- Unit buy = spawn automatique chez un adversaire (⚠️ voisin direct / random ?)
- Chaque envoi augmente ton **income**
- Moins d'or pour les tours = choix stratégique

### Vision et brouillard de guerre

- 🤔 Voir uniquement son propre terrain
- 🤔 Vision limitée de l’adversaire (ex : fragments ou aura)
- ⚠️ Unités en attente visibles, mais **pas leur destination**

### Mob Lifecycle

- Unité non tuée continue ⚠️ affaiblie ou renvoyée ?
- Type de mobs varié : tank, rapide, flying, boss...

---

## 📦 Taverne : Détails shop

### Les Tours

- Achats permanents, restent sur la carte
- Bloquent le passage, modifient le path
- Synergies possibles (type, effet, placement)

### Les Unités

- Spawnent automatiquement pour le prochain tick
- Servent à mettre la pression + income
- ⚠️ Peuvent être visibles par tous avant leur envoi

---

## 👁️ Exemples de Progression

- **Early game** : income + premiers tests
- **Mid game** : adaptation + vision de l’adversaire
- **Late game** : shops puissants, combats serrés
- **Finale 1v1** : plus de hasard, skill pur

---

## ✅ Mécaniques validées

- ✅ Shop commun type battlegrounds
- ✅ Combat permanent avec tick toutes les ⚠️ X secondes
- ✅ Vision dynamique (fragments, aura, brouillard)
- ✅ Income par achat d’unités
- ✅ Pathing dynamique
- ✅ Mobs variés avec effets
- ✅ Finale 1v1 en duel direct

---

## 🔧 À discuter

- ⚠️ Nombre de joueurs exact
- ⚠️ Intervalle de tick/loop
- ⚠️ Destination des unités envoyées (random ? ciblé ? round robin ?)
- 🤔 Upgrades de tour (fusion, synergie, passif ?)
- 🤔 Gestion d’économie (hard cap, intérêt ?)
- 🤔 Possibilité de vendre ses tours ?
- 🤔 les tours peuvent avoir des forment différentes à la Tétris pour complexifier le positionnement?
- 🤔 les tours sont construite dynamiquement, addition aléatoire de forme, type, action, bonus?
- 🤔 les unités sont construit dynamiquement, addition aléatoire de forme, type, action, bonus?
- 🤔 Le spawn des mobs peut être déplacer par les adversaires?
