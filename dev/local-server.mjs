// Local rehearsal server: same protocol as the AWS backend, runs on your laptop.
// Use it to preview the pages before deploying.  cd dev && npm install && node local-server.mjs
// Then open http://localhost:8080 (phone), /screen.html, /control.html?key=local
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8080);
const ADMIN_KEY = process.env.ADMIN_KEY || 'local';
const WEB = fileURLToPath(new URL('../web/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2' };

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  if (p === '/config.js') {
    res.writeHead(200, { 'content-type': 'text/javascript' });
    return res.end("window.WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';");
  }
  const file = normalize(join(WEB, p));
  if (!file.startsWith(WEB)) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
});

const wss = new WebSocketServer({ server, path: '/ws' });
const conns = new Map(); // ws -> info
let meter = { taps: 0, tappers: 0, goal: 1, active: false, done: false };
let tug = { a: 0, b: 0, goal: 1, startsAt: 0, endsAt: 0, mode: '', teamA: '', teamB: '', active: false, done: false, winner: '' };
let quiz = { round: 0, q: 0, phase: 'none', counts: [0, 0, 0, 0], total: 0, phones: 0, endsAt: 0 };
const quizView = () => ({ type: 'quiz', ...quiz, counts: [...quiz.counts], now: Date.now() });
const tugView = () => ({ type: 'tug', ...tug, now: Date.now() });
function finishTug() {
  if (tug.done) return;
  tug.done = true; tug.active = false;
  tug.winner = tug.a === tug.b ? 'draw' : tug.a > tug.b ? 'A' : 'B';
  broadcast({ name: 'tugwin', winner: tug.winner, mode: tug.mode, a: tug.teamA, b: tug.teamB, scoreA: tug.a, scoreB: tug.b,
    phones: tug.phones, seconds: Math.max(1, Math.round((Math.min(Date.now(), tug.endsAt) - tug.startsAt) / 1000)) }, 600);
}
const chargeView = () => ({ type: 'charge', ...meter, level: Math.min(1, meter.taps / meter.goal) });
function broadcast(effect, lead = 1200, perPhone = null) {
  const at = Date.now() + lead;
  const payload = JSON.stringify({ type: 'effect', effect, at });
  let n = 0;
  for (const [c, info] of conns) if (info.role !== 'pending') {
    const own = perPhone && perPhone(c);
    send(c, own ? JSON.stringify({ type: 'effect', effect: { ...effect, ...own }, at }) : payload); n++;
  }
  return n;
}
const send = (ws, o) => ws.readyState === 1 && ws.send(typeof o === 'string' ? o : JSON.stringify(o));

let calls = 0;
wss.on('connection', (ws) => {
  conns.set(ws, { role: 'pending' });
  ws.on('close', () => conns.delete(ws));
  ws.on('message', (buf) => {
    calls++;
    let m; try { m = JSON.parse(buf.toString()); } catch { return; }
    const me = conns.get(ws);
    if (m.action === 'sync') return send(ws, { type: 'sync', t0: m.t0, s: Date.now() });
    if (m.action === 'join') {
      if (m.role === 'admin' && m.key !== ADMIN_KEY) return send(ws, { type: 'error', code: 'badkey' });
      Object.assign(me, { role: m.role || 'phone', dept: m.dept || 'OTHER', zone: m.zone || 'center', city: m.city || '' });
      return send(ws, { type: 'joined', role: me.role });
    }
    if (m.action === 'stats') {
      const s = { type: 'stats', phones: 0, depts: {}, zones: {}, cities: {}, calls, rows: conns.size + 3, now: Date.now() };
      for (const c of conns.values()) if (c.role === 'phone') {
        s.phones++; s.depts[c.dept] = (s.depts[c.dept] || 0) + 1; s.zones[c.zone] = (s.zones[c.zone] || 0) + 1;
        if (c.zone === 'remote' && c.city) s.cities[c.city] = (s.cities[c.city] || 0) + 1;
      }
      return send(ws, s);
    }
    if (m.action === 'tap') {
      if (!meter.active) return;
      meter.taps += Math.min(40, Math.max(1, m.n | 0)); if (m.first) meter.tappers++;
      send(ws, chargeView());
      if (meter.taps >= meter.goal && !meter.done) { meter.done = true; meter.active = false; broadcast({ name: 'powered' }); }
      return;
    }
    if (m.action === 'charge') return send(ws, chargeView());
    if (m.action === 'tug') {
      const now = Date.now();
      if (!tug.active || now < tug.startsAt || now >= tug.endsAt) return;
      tug[m.team === 'B' ? 'b' : 'a'] += Math.min(40, Math.max(1, m.n | 0));
      send(ws, tugView());
      if (Math.abs(tug.a - tug.b) >= tug.goal) finishTug();
      return;
    }
    if (m.action === 'answer') {
      const choice = m.choice | 0, round = Number(m.round) || 0;
      if (choice < 0 || choice > 3 || !round || me.quizRound === round) return;
      me.quizRound = round;
      if (quiz.round !== round || quiz.phase !== 'ask' || Date.now() - 1500 >= quiz.endsAt) return send(ws, { type: 'answered', ok: false });
      quiz.counts[choice]++; quiz.total++;
      return send(ws, { type: 'answered', ok: true, round, choice });
    }
    if (m.action === 'quizstate') return send(ws, quizView());
    if (m.action === 'tugstate') {
      send(ws, tugView());
      if (tug.active && Date.now() >= tug.endsAt) finishTug();
      return;
    }
    if (m.action === 'cmd') {
      if (m.key !== ADMIN_KEY) return send(ws, { type: 'error', code: 'badkey' });
      const effect = m.effect || {};
      if (effect.name === 'charge') {
        const phones = [...conns.values()].filter((c) => c.role === 'phone').length;
        effect.goal = Math.max(5, phones) * (effect.perPerson || 40);
        meter = { taps: 0, tappers: 0, goal: effect.goal, active: true, done: false };
      }
      let perPhone = null;
      if (effect.name === 'tug') {
        const deck = [...conns].filter(([, c]) => c.role === 'phone').map(([ws]) => ws);
        for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        const teamOf = new Map(deck.map((ws, i) => [ws, i % 2 === 0 ? 'A' : 'B']));
        perPhone = (ws) => (teamOf.has(ws) ? { team: teamOf.get(ws) } : null);
        const phones = deck.length;
        effect.sizeA = Math.ceil(phones / 2); effect.sizeB = Math.floor(phones / 2);
        effect.mode = 'random'; effect.a = 'RED'; effect.b = 'BLUE';
        effect.seconds = effect.seconds || 45;
        effect.goal = Math.max(5, phones) * 8;
        effect.startsAt = Date.now() + 1200 + 3000;
        effect.endsAt = effect.startsAt + effect.seconds * 1000;
        tug = { a: 0, b: 0, goal: effect.goal, startsAt: effect.startsAt, endsAt: effect.endsAt, mode: effect.mode,
          teamA: effect.a, teamB: effect.b, active: true, done: false, winner: '', phones };
      }
      if (effect.name === 'quiz') {
        effect.phase = effect.phase || 'ask';
        if (effect.phase === 'ask') {
          const at = Date.now() + 1200;
          effect.seconds = effect.seconds || 20; effect.round = at; effect.endsAt = at + effect.seconds * 1000;
          effect.phones = [...conns.values()].filter((c) => c.role === 'phone').length;
          quiz = { round: at, q: effect.q || 0, phase: 'ask', counts: [0, 0, 0, 0], total: 0, phones: effect.phones, endsAt: effect.endsAt };
        } else if (effect.phase === 'reveal') {
          quiz.phase = 'reveal';
          Object.assign(effect, { q: quiz.q, round: quiz.round, counts: [...quiz.counts], total: quiz.total, phones: quiz.phones });
        }
      }
      const t = Date.now();
      const n = broadcast(effect, 1200, perPhone);
      return send(ws, { type: 'ack', effect: effect.name, sent: n, failed: 0, ms: Date.now() - t });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Local show running:
  phone   http://localhost:${PORT}/
  screen  http://localhost:${PORT}/screen.html
  control http://localhost:${PORT}/control.html?key=${ADMIN_KEY}`);
});
