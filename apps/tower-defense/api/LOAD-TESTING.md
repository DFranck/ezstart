# 🧪 Load Testing Tower Defense

## 📋 Overview

Script de test de charge pour valider les performances de Tower Defense avec 8+ joueurs simultanés.

## 🚀 Usage

### Test Standard (8 joueurs, 60 secondes)
```bash
cd apps/tower-defense/api
pnpm test:load
```

### Test Intensif (16 joueurs)
```bash
pnpm test:load:16
```

### Test de Stress (20 joueurs, 2 minutes)
```bash
pnpm test:load:stress
```

### Test Custom
```bash
# Variables d'environnement disponibles
API_URL=http://localhost:5030  # URL de l'API à tester
NUM_PLAYERS=8                   # Nombre de joueurs simultanés
TEST_DURATION_MS=60000          # Durée du test en millisecondes

# Exemple
NUM_PLAYERS=12 TEST_DURATION_MS=90000 pnpm test:load
```

## 📊 Métriques Mesurées

Le script mesure automatiquement :

- **Duration** : Durée totale du test
- **Players** : Nombre de joueurs simulés
- **Games Created** : Nombre de parties créées
- **Total Actions** : Actions totales exécutées
  - Towers Placed : Tours placées
  - Mobs Spawned : Mobs générés
- **Total Errors** : Erreurs rencontrées
- **Avg Latency** : Latence moyenne des requêtes
- **Actions/second** : Débit d'actions par seconde

## ✅ Critères de Succès

- **Error Rate < 10%** : Moins de 10% d'erreurs sur les actions
- **Avg Latency < 200ms** : Latence moyenne sous 200ms
- **No Crashes** : Serveur stable pendant toute la durée

## 🎯 Résultats Attendus

### Configuration Standard (8 joueurs)
```
Duration:          ~61s
Players:           8
Total Actions:     ~150-200
Avg Latency:       ~50-100ms
Actions/second:    ~2.5-3.5
✅ SUCCESS: All tests passed with good performance!
```

### Configuration Stress (20 joueurs)
```
Duration:          ~121s
Players:           20
Total Actions:     ~500-700
Avg Latency:       ~100-200ms
Actions/second:    ~4-6
⚠️ WARNING: Monitor server CPU/RAM usage
```

## 🔧 Architecture du Test

1. **Création des joueurs** : Simule la création de N joueurs via l'API REST
2. **Création de partie** : Un joueur hôte crée une partie
3. **Connexion Socket.IO** : Tous les joueurs se connectent via WebSocket
4. **Join Game** : Tous les joueurs rejoignent la partie
5. **Simulation d'actions** : Chaque joueur effectue des actions aléatoires (placer tours, spawn mobs)
6. **Collecte de stats** : Mesure latence, erreurs, débit
7. **Rapport final** : Affichage des statistiques globales et par joueur

## 🐛 Troubleshooting

### Erreur "Cannot find module 'socket.io-client'"
```bash
cd apps/tower-defense/api
pnpm install
```

### Erreur "Failed to create player"
Vérifier que l'API est démarrée :
```bash
cd apps/tower-defense/api
pnpm dev
```

### High Error Rate (>10%)
Causes possibles :
- Serveur surchargé (CPU/RAM)
- MongoDB trop lent
- Collisions de placement de tours (normal avec placement aléatoire)
- Ticker engine en surcharge (>200ms par tick)

### High Latency (>500ms)
Causes possibles :
- Base de données lente (check MongoDB Atlas performance)
- Serveur CPU saturé (check `top` ou Task Manager)
- Réseau lent (si test sur serveur distant)
- Trop de mobs actifs (>200 mobs simultanés)

## 📈 Optimisations Testées

Le load testing valide les optimisations suivantes :

1. **Spatial Grid** : Collision O(n²) → O(n)
2. **Tick Rate** : 250ms = 4 ticks/sec optimal
3. **État en Mémoire** : Pas de DB dans la game loop
4. **Async DB Updates** : Sauvegardes non-bloquantes
5. **Socket.IO Rooms** : Broadcasting optimisé

## 🎓 Exemple de Sortie

```
🚀 Starting load test with 8 players for 60000ms

📝 Creating players...
✅ Player LoadTest_Player0 connected
✅ Player LoadTest_Player1 connected
...
✅ 8 players created

🎮 Creating game...
🎮 Game created by LoadTest_Player0: 673d4f... (45ms)
✅ Game created: 673d4f...

👥 Players joining game...
👥 LoadTest_Player1 joined game 673d4f... (32ms)
👥 LoadTest_Player2 joined game 673d4f... (28ms)
...
✅ All 8 players joined game

⏱️ Running test for 60 seconds...

🛑 Stopping test...

============================================================
📊 LOAD TEST RESULTS
============================================================
Duration:          61.24s
Players:           8
Games Created:     1
Total Actions:     187
  - Towers Placed: 112
  - Mobs Spawned:  75
Total Errors:      3
Avg Latency:       67.43ms
Actions/second:    3.05
============================================================

👥 PER-PLAYER STATISTICS:
  LoadTest_Player0: 24 actions, 0 errors
  LoadTest_Player1: 23 actions, 1 errors
  LoadTest_Player2: 25 actions, 0 errors
  LoadTest_Player3: 22 actions, 0 errors
  LoadTest_Player4: 24 actions, 1 errors
  LoadTest_Player5: 23 actions, 0 errors
  LoadTest_Player6: 24 actions, 1 errors
  LoadTest_Player7: 22 actions, 0 errors

✅ SUCCESS: All tests passed with good performance!
```

## 🔍 Monitoring Serveur

Pendant le load test, surveiller :

### Logs API
```bash
cd apps/tower-defense/api
pnpm dev
# Observer les logs de performance :
# ⚠️ [Ticker] Slow tick #... → Tick >200ms
# 📊 [Ticker] Game ... stats → Stats toutes les 10s
```

### Métriques Système
```bash
# Linux/Mac
top
htop

# Windows
Task Manager → Performance

# Metrics clés :
# - CPU usage < 80%
# - RAM usage stable
# - No memory leaks
```

## 📝 Notes

- Le script crée des joueurs avec prefix `LoadTest_` dans la DB
- Les parties de test peuvent rester dans la DB après le test
- Nettoyage manuel recommandé après tests répétés
- Ne pas lancer sur environnement de production !
