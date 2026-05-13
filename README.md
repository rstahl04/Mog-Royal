# Mog Royal MVP

First playable prototype for the Mog Royal live battle platform.

## Run

```powershell
npm start
```

Open `http://localhost:3001`.

## Deploy

See [DEPLOY.md](DEPLOY.md).

## Included in Build 01

- Arena app shell
- Camera permission and local preview
- Server-backed matchmaking queue
- Native WebRTC peer connection between two browser tabs/devices
- Lightweight WebSocket signaling server with no package install required
- Cancel queue, leave battle, camera toggle, and mic toggle controls
- Readiness checks for camera, signaling, and peer connection
- In-room chat and quick reactions
- Live battle timer
- Voting and result flow
- MMR, XP, streak, and wins
- Multiple game mode structure
- Leaderboard
- Profile editor
- Report, block, guidelines, and admin summary surfaces

## Next Engineering Phase

- Move matchmaking, reporting, and stats into a real database
- Add production TURN service credentials for non-local networks
- Persist users, matches, reports, and ranks in a database
- Add auth
- Add spectator voting
