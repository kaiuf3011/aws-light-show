// Simulates N phones joining the show, to rehearse without 300 real people.
// Usage (from the dev/ folder, after `npm install`):
//   node fake-phones.mjs 300                       -> uses the URL in ../web/config.js
//   node fake-phones.mjs 300 wss://xxxx.execute-api.ap-south-1.amazonaws.com/live
// Leave it running, open the projector screen, and press buttons on the control panel.
import WebSocket from 'ws';
import { readFileSync } from 'node:fs';

const N = Number(process.argv[2] || 50);
let url = process.argv[3];
if (!url) {
  const cfg = readFileSync(new URL('../web/config.js', import.meta.url), 'utf8');
  const m = cfg.match(/"(wss?:\/\/[^"]+)"/);
  if (!m) { console.error('Pass the WebSocket URL as the 2nd argument (run deploy.sh first).'); process.exit(1); }
  url = m[1];
}

const DEPTS = ['CSE', 'AI&ML', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'OTHER'];
const ZONES = ['left', 'center', 'right'];
const CITIES = ['Dubai', 'Chennai', 'Bengaluru', 'Singapore'];

let open = 0, failed = 0, effects = 0;
const lateness = [];

function phone(i) {
  const ws = new WebSocket(url);
  let offset = 0, best = Infinity;
  ws.on('open', () => {
    open++;
    const remote = i % 60 === 59;
    ws.send(JSON.stringify({
      action: 'join', role: 'phone',
      dept: DEPTS[Math.floor(Math.random() * DEPTS.length)],
      zone: remote ? 'remote' : ZONES[i % 3],
      city: remote ? CITIES[(i / 60 | 0) % CITIES.length] : '',
    }));
    for (let k = 0; k < 3; k++) setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ action: 'sync', t0: Date.now() })), 400 * k + Math.random() * 300);
  });
  ws.on('message', (buf) => {
    const m = JSON.parse(buf.toString());
    if (m.type === 'sync') {
      const t1 = Date.now(), rtt = t1 - m.t0;
      if (rtt < best) { best = rtt; offset = m.s - (m.t0 + t1) / 2; }
    } else if (m.type === 'effect') {
      effects++;
      // during a power-up, ~70% of fake phones tap 3-7 times per second
      clearInterval(ws._tap);
      if (m.effect.name === 'tug') {
        // fake crowd: team A pulls a bit harder than team B so the rope visibly moves
        const team = m.effect.team || (Math.random() < 0.5 ? 'A' : 'B');
        const n = team === 'A' ? 4 : 3; // fake crowd: red pulls slightly harder so the rope visibly moves
        setTimeout(() => {
          ws._tap = setInterval(() => {
            if (ws.readyState === 1) ws.send(JSON.stringify({ action: 'tug', team, n: n + Math.floor(Math.random() * 2) }));
          }, 600);
        }, Math.max(0, m.effect.startsAt - (Date.now() + offset)) + Math.random() * 1500);
      }
      if (m.effect.name === 'charge' && Math.random() < 0.7) {
        let first = true;
        setTimeout(() => {
          ws._tap = setInterval(() => {
            if (ws.readyState !== 1) return;
            ws.send(JSON.stringify({ action: 'tap', n: 2 + Math.floor(Math.random() * 4), first }));
            first = false;
          }, 800);
        }, Math.max(0, m.at - (Date.now() + offset)) + Math.random() * 3000);
      }
      lateness.push(Date.now() + offset - m.at); // negative = arrived before its start time (good)
    }
  });
  ws.on('error', () => { failed++; });
  ws.on('close', () => { open = Math.max(0, open - 1); });
}

console.log(`Connecting ${N} fake phones to ${url}`);
for (let i = 0; i < N; i++) setTimeout(() => phone(i), i * 15); // ~65 joins/sec, like a real crowd scanning

setInterval(() => {
  let line = `connected: ${open}/${N}  failed: ${failed}  effects received: ${effects}`;
  if (lateness.length) {
    const s = lateness.splice(0).sort((a, b) => a - b);
    const early = s.filter((x) => x <= 0).length;
    line += `  | last burst: ${early}/${s.length} arrived before start time, worst ${Math.round(s[s.length - 1])} ms`;
  }
  console.log(line);
}, 3000);
