# Mog Royal MVP

First playable prototype for the Mog Royal live battle platform.

## Run

```powershell
npm start
```

Open `http://localhost:3001`.

## Deploy

See [DEPLOY.md](DEPLOY.md).

## Included

- Server-backed matchmaking queue
- Native WebRTC peer connection between two browser tabs/devices
- Lightweight WebSocket signaling server
- Guest/casual mode and account-gated ranked modes
- Camera/mic controls
- In-room chat and quick reactions
- Live battle timer
- Voting and result flow
- Tie rounds with no MMR loss
- MMR, XP, streak, wins, and placements
- Custom private matches
- Solo AI scan demo
- AI entertainment rating cards after non-Drip Check matches

## Next Engineering Phase

- Database-backed auth
- Real email provider for verification codes
- Database-backed stats and match history
- Redis-backed matchmaking if using multiple server instances
- TURN server credentials for reliable WebRTC across networks
- Server-authoritative AI scoring
