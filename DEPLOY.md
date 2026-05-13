# Deploy Mog Royal

## Recommended: Render

1. Create a GitHub repository.
2. Push this project to GitHub.
3. In Render, create a new Web Service from that repo.
4. Use:
   - Environment: `Node`
   - Build command: blank or `npm install`
   - Start command: `npm start`
5. Render will provide a public URL.

The app reads `process.env.PORT`, so it works with Render/Railway-assigned ports.

## Keep Editing Locally

Run locally:

```powershell
npm start
```

Open:

```text
http://localhost:3001
```

After making changes:

```powershell
git add .
git commit -m "Update Mog Royal"
git push
```

The hosted service redeploys from GitHub.

## Production Notes

Current MVP storage is browser-local. Before real users, add:

- Database-backed auth
- Database-backed stats and match history
- Redis-backed matchmaking if using multiple server instances
- TURN server credentials for reliable WebRTC across networks
- Server-authoritative AI scoring
