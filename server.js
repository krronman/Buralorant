const express = require('express'), http = require('http'), path = require('path');
const { WebSocketServer } = require('ws');
const app = express();
const fs = require('fs');
const INDEX = [path.join(__dirname, 'index.html'), path.join(__dirname, 'public', 'index.html')].find(f => fs.existsSync(f));
app.get('/', (q, r) => INDEX ? r.sendFile(INDEX) : r.status(500).send('index.html is missing from the deployed repo. Upload it next to server.js.'));
app.get('/health', (q, r) => r.send('ok'));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const SPAWNS = [[0,1.7,6],[20,1.7,20],[-20,1.7,15],[15,1.7,8],[-15,1.7,8],[30,1.7,0],[-30,1.7,5],[0,1.7,30],[35,1.7,-20],[-35,1.7,-15]];
const spawn = () => SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
const P = new Map(); let nid = 1;
const pub = p => ({ id: p.id, name: p.name, cls: p.cls, pos: p.pos, alive: p.alive });
const board = () => [...P.values()].map(p => ({ id: p.id, name: p.name, k: p.k, d: p.d }));
const send = (ws, m) => ws.readyState === 1 && ws.send(JSON.stringify(m));
const all = (m, except) => { const s = JSON.stringify(m); for (const p of P.values()) if (p.ws !== except && p.ws.readyState === 1) p.ws.send(s); };
const v3 = a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite) ? a.map(n => Math.max(-200, Math.min(200, n))) : null;

wss.on('connection', ws => {
  const me = { id: nid++, ws, name: 'Player', cls: 'jett', hp: 100, alive: true, k: 0, d: 0, pos: spawn(), joined: false };
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'join' && !me.joined) {
      me.name = String(m.name || 'Player').replace(/[<>&"]/g, '').slice(0, 16) || 'Player';
      me.cls = m.cls === 'guard' ? 'guard' : 'jett'; me.joined = true; P.set(me.id, me);
      send(ws, { t: 'init', id: me.id, spawn: me.pos, players: [...P.values()].filter(p => p !== me).map(pub), board: board() });
      all({ t: 'join', p: pub(me), board: board() }, ws); return;
    }
    if (!me.joined) return;
    if (m.t === 's') { const p = v3(m.p); if (!p) return; me.pos = p; all({ t: 's', id: me.id, p, y: +m.y || 0 }, ws); }
    else if (m.t === 'shot') { const o = v3(m.o), e = v3(m.e); if (o && e) all({ t: 'shot', id: me.id, o, e }, ws); }
    else if (m.t === 'fx') { const p = v3(m.p); if (p) all({ t: 'fx', id: me.id, k: m.k === 's' ? 's' : 'e', p, r: Math.min(8, +m.r || 4) }, ws); }
    else if (m.t === 'hit') {
      const v = P.get(m.id);
      if (!me.alive || !v || !v.alive || v === me) return;
      v.hp -= Math.min(200, Math.max(0, +m.dmg || 0));
      if (v.hp <= 0) {
        v.hp = 0; v.alive = false; v.d++; me.k++;
        all({ t: 'kill', k: me.id, v: v.id, kn: me.name, vn: v.name, board: board() });
        setTimeout(() => { if (!P.has(v.id)) return; v.hp = 100; v.alive = true; v.pos = spawn(); all({ t: 'respawn', id: v.id, p: v.pos }); }, 3000);
      } else send(v.ws, { t: 'hp', hp: v.hp });
    }
  });
  ws.on('close', () => { if (P.delete(me.id)) all({ t: 'leave', id: me.id, board: board() }); });
});
setInterval(() => wss.clients.forEach(c => c.readyState === 1 && c.ping()), 25000); // keep proxies from dropping idle sockets
server.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('listening'));
