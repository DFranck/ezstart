# Tower Defense - Testing Guide

## ✅ Manual Testing Results (2025-09-30)

### API Endpoints Tested

#### 1. Health Check
```bash
curl http://localhost:5030/api/health
# ✅ Response: {"status":"ok"}
```

#### 2. Create Player
```bash
curl -X POST http://localhost:5030/api/players \
  -H "Content-Type: application/json" \
  -d '{"name":"TestPlayer","userId":"test-user-123"}'

# ✅ Response: Player created with ID
```

#### 3. Create Game
```bash
curl -X POST http://localhost:5030/api/games \
  -H "Content-Type: application/json" \
  -d '{"playerId":"68dbded73cb0bf36e6849474"}'

# ✅ Response: Game created with ID
```

#### 4. Get Game Details
```bash
curl http://localhost:5030/api/games/68dbdee23cb0bf36e6849477

# ✅ Response: Full game state with players, phase, etc.
```

### 🐛 Known Issues Found

#### Issue 1: Tower Placement Rejected - Game Phase
**Symptom:** "Invalid tower placement" error when trying to place towers

**Root Cause:** Game is in phase `"waiting"` instead of `"playing"`

**Why it happens:**
- Game starts in `"waiting"` phase
- Tower placement is only allowed in `"playing"` phase
- Game phase changes via Socket.IO `lobby:startCountdown` event
- Must start game from lobby first

**Solution:**
1. Join lobby (`http://localhost:5035/en/lobby/{gameId}`)
2. Click "Start Game" button (host only)
3. Socket.IO emits `lobby:startCountdown`
4. Server transitions game to `"playing"` phase
5. Then towers can be placed

**Prevention:**
- UI should disable tower shop until game.phase === 'playing'
- Show "Waiting for game to start..." message
- Better error messages from validation

#### Issue 2: Player ID Type Mismatch (Potential)
**Check:** Verify player._id matches exactly between:
- Frontend: `currentPlayer?._id` (from usePlayerStore)
- Backend: `game.players[].player._id` (from game state)
- Action payload: `action.payload.playerId`

**Logs Added:** Now logging full validation context in API

### Socket.IO Events Flow

```
1. Player joins lobby
   → socket.emit('lobby:join', {gameId, playerId})

2. Host starts game
   → socket.emit('lobby:startCountdown', {gameId, playerId})

3. Server changes phase
   → game.phase = 'playing'
   → socket.broadcast('gameState', updatedGame)

4. Player can place towers
   → socket.emit('game:action', {type: 'placeTower', payload: {...}})

5. Server validates & processes
   → ticker.canPlaceTowerAt() checks:
     - Game phase === 'playing' ✓
     - Player exists in game ✓
     - Coordinates valid ✓
     - No collision ✓
```

### Testing Checklist

- [x] API health check works
- [x] Player creation endpoint works
- [x] Game creation endpoint works
- [x] Game retrieval endpoint works
- [ ] Socket.IO game start flow (requires UI)
- [ ] Tower placement in 'playing' phase (requires UI)
- [ ] Multi-player sync (requires 2+ clients)

### Next Steps

1. **Add phase guard in UI:**
   ```tsx
   if (game.phase !== 'playing') {
     toast.error('Wait for game to start!')
     return
   }
   ```

2. **Better error messages:**
   - "Game not started yet" instead of "Invalid tower placement"
   - Check phase before allowing drag

3. **Visual feedback:**
   - Disable/gray out shops in waiting phase
   - Show countdown timer
   - Clear "Game starting..." message

### Useful Commands

```bash
# Check API logs
cd apps/tower-defense/api && pnpm dev

# Check Web logs
cd apps/tower-defense/web && pnpm dev

# Test with curl
curl -s http://localhost:5030/api/games/{gameId} | python -m json.tool

# Kill all node processes (if ports stuck)
taskkill /F /IM node.exe
```

## Test Players Created

| Name | Player ID | User ID | Status |
|------|-----------|---------|--------|
| TestPlayer | 68dbded73cb0bf36e6849474 | test-user-123 | ✅ Active |
| DFranck | 68be906fc077386dc057a7cc | 68be4f9ccbb1d1be4dc05135 | ✅ Active |

## Test Games Created

| Game ID | Host | Phase | Players | Status |
|---------|------|-------|---------|--------|
| 68dbdee23cb0bf36e6849477 | TestPlayer | waiting | 1 | ✅ Created |
| 68dbcc353467da76c2cab4fa | DFranck | playing | 1 | ✅ Active |