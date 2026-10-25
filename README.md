# M4A1 Range Online

Multiplayer version of the range: Node.js + WebSocket server (`server.js`) serving the game from `public/`.

## Deploy on Render
1. Push this folder to a GitHub repo.
2. Render dashboard -> **New -> Blueprint** (it reads `render.yaml`), or **New -> Web Service** with:
   Build `npm install`, Start `node server.js`, Health check path `/health`.
3. Open your `https://<name>.onrender.com` URL and share it. Everyone who opens it joins the same match.

Local test: `npm install && npm start` then open http://localhost:3000 in two tabs.

## Notes
- Free Render instances sleep after ~15 min idle; the first visit can take ~30s to wake.
- Hit detection is client-reported (server caps damage, handles health, kills, respawns, scores). Fine for friends, not cheat-proof.
- Smoke and explosions are synced; the airstrike plane and practice dummies are local to each player.
- Tab = scoreboard.
