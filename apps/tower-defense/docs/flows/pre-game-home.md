# 🔁 Flow complet – Avant lancement de partie

## 🏠 Page d’accueil `/`

- 🔍 Liste des parties en attente (`GET /api/games?status=waiting`)
- Affichage :
  - `<WaitingGameCard />` pour chaque partie
    - Infos : `gameId`, `players.length`, `players[].name`
    - Action : `<JoinGameButton />`

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
