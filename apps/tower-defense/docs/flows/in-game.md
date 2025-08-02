# 🔁 Flow complet – In game

## 🎮 Page game ongoing `/games/:gameId`

- Affichage :

  - [🎮 Zone de jeu `<GameCanvas/>`](./in-game-canvas.md)

## ✅ Action : rejoindre une partie

- Via `<JoinGameButton />` :
  - Appel : `POST /api/games/:id/join`
  - Réponse : `gameId`, `playerData`, redirection vers `/lobby/:gameId`
  - Alternative temps réel : `socket.emit('join', { gameId })`

## 🧩 Composants impliqués

| Composant         | Rôle                                      |
| ----------------- | ----------------------------------------- |
| `WaitingGameCard` | Affiche les infos d’une partie en attente |
| `JoinGameButton`  | Envoie la requête, puis redirige          |
