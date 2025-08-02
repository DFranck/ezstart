# 🔁 Flow complet – Avant lancement de partie

## 🧍 Lobby `/lobby/:gameId`

- 🔍 Liste des joueurs en attente (`game.players`)
- Affichage :
  - `<WaitingPlayerCard />` pour chaque player
    - Infos : `players[].name`, some other infos
    - Action : None for now

## ✅ Action : Start la partie

- Via `<StartGameButton />` :
  - Le host envoie la requête, un compte a rebours est déclenché avant l'appel reel. si des joueurs partent ou arrivent, le compte a rebours est annulée, il faut cliquer de nouveau sur start.
  - Appel : `POST /api/games/:id/start`
  - Réponse : `gameData`, redirection vers `/games/:gameId`
  - Alternative temps réel : `socket.emit('join', { gameId })`

## ✅ Action : Leave la partie

- Via `<LeaveGameButton />` :
  - Appel : `POST /api/games/:id/leave`
  - Redirection vers `/`
  - Alternative temps réel : `socket.emit('leave', { gameId })`

## 🧩 Composants impliqués

| Composant           | Rôle                                     |
| ------------------- | ---------------------------------------- |
| `WaitingPlayerCard` | Affiche les infos d’un joueur en attente |
| `StartGameButton`   | Envoie la requête, puis redirige         |
| `LeaveGameButton`   | Envoie la requête, puis redirige         |
