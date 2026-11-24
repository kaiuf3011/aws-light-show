// 3D explainer for the light show: one scene, ten steps, camera moves between them.
// Built with three.js (MIT). Bundled to web/explain.js by explain/build.sh.
import * as THREE from 'three';

// ---------- look: the terminal direction (graphite, one AWS-orange accent) ----------
const C = {
  bg: 0x0f0f10, ground: 0x1d1d20, body: 0x1f1f22, edge: 0x6e6e74, edgeDim: 0x3a3a3f,
  accent: 0xff9900, red: 0xe5484d, blue: 0x3e8bff, phone: 0x2c2c31, white: 0xededed,
};
const TEMPLATE_LINES = typeof __TEMPLATE_LINES__ !== 'undefined' ? __TEMPLATE_LINES__ : 200;
const LIVE_STEP = 9;
const STEPS = [
  { kicker: 'aws cloud club · rgu', h: 'All phones in this room, one button', p: 'What actually happened when you tapped. Five pieces, zero servers to manage.', cam: [-2, 11.5, 20], at: [-2, 0.4, 0], labels: ['phones', 's3', 'gw', 'lambda', 'db'] },
  { kicker: '01 · the menu', h: 'Your phone opened a page from S3', p: 'Amazon S3 stores the website as plain files. Scanning the QR code just downloads them, nothing is running.', cam: [-15.5, 7.5, 9.5], at: [-11.2, 0.6, 0.6], labels: ['phones', 's3'] },
  { kicker: '02 · the waiter', h: 'Every phone keeps a line open', p: 'API Gateway holds one WebSocket per phone, so AWS can send you something at any moment without you asking.', cam: [-8, 8, 12.5], at: [-5.8, 1.1, 0.4], labels: ['phones', 'gw'] },
  { kicker: '03 · the chef', h: 'Each message wakes my code', p: 'AWS Lambda runs my code only when a message arrives, for a few milliseconds. No message: nothing running, nothing to pay.', cam: [0.2, 6, 10], at: [0.2, 1.7, 0], labels: ['gw', 'lambda'] },
  { kicker: '04 · the fridge', h: 'DynamoDB remembers who is here', p: 'Lambda forgets everything between runs, so the database is its memory: one row for every phone in this room.', cam: [5.6, 5.5, 8.5], at: [5.6, 0.9, 0], labels: ['lambda', 'db'] },
  { kicker: '05 · one button', h: 'One press reaches every phone', p: 'My button goes to Lambda. Lambda reads every row and sends one message per phone, all in under a second.', cam: [-1, 11, 15], at: [-1, 0.2, 0.5], labels: ['you', 'phones', 'gw', 'lambda', 'db'] },
  { kicker: '06 · the same moment', h: 'Fire at the same instant, not on arrival', p: 'Messages land at slightly different times. Every phone synced its clock with AWS, so they all wait and fire together.', cam: [-10, 9.5, 11], at: [-10.4, 0, 1.4], labels: [] },
  { kicker: '07 · scaling', h: '300 people tapping at once', p: 'AWS starts more copies of the chef by itself. The database adds every pull in one unbreakable step, so none are lost.', cam: [-0.5, 9, 14], at: [0, 0.6, 0], labels: ['phones', 'gw', 'lambda', 'db'] },
  { kicker: '08 · infrastructure as code', h: `All of this is one ${TEMPLATE_LINES}-line file`, p: 'I described the five pieces in a template. AWS built them in about three minutes, and one command deletes them.', cam: [-2.5, 12, 19], at: [-2.5, 0.6, 0], labels: ['s3', 'gw', 'lambda', 'db'] },
  { kicker: '09 · live', h: 'This is AWS, right now', p: 'Every dot is a real message from a phone in this room. Watch what happens when I press a button.', cam: [-3.2, 12.5, 21], at: [-3.2, 0.3, 0.4], labels: ['phones', 'gw', 'lambda', 'db', 'you'] },
  { kicker: '10 · the bill', h: 'Servers I manage: 0', p: 'All of tonight cost less than a cup of chai. Want to build this yourself? That is what the AWS Cloud Club is for.', cam: [-2.5, 15, 25], at: [-2.5, 0, 0], labels: ['phones', 's3', 'gw', 'lambda', 'db'] },
];

// ---------- live data from the real backend (falls back to a simulation) ----------
const LIVE = { on: false, phones: 0, calls: null, rate: 0, rtt: null, offset: 0, region: 'local' };
(function connectLive() {
  if (typeof window.ShowClient !== 'function' || !window.WS_URL) return;
  const m = String(window.WS_URL).match(/execute-api\.([a-z0-9-]+)\./); LIVE.region = m ? m[1] : 'local';
  let prev = null, player = null, quiz = null;
  const client = window.ShowClient({
    role: 'screen',
    onStatus: (st) => { LIVE.on = st === 'open'; liveTag(); },
    onMessage: (msg) => {
      if (quiz) quiz.onMessage(msg);
      if (msg.type === 'effect') { if (player) player.push(msg); liveBroadcast(msg.effect, msg.at); }
      if (msg.type === 'charge') LIVE.charge = msg;
      if (msg.type === 'tug') LIVE.tug = msg;
      if (msg.type !== 'stats') return;
      LIVE.rtt = client.bestRtt(); LIVE.offset = client.offset();
      liveStats(msg);
    },
  });
  LIVE.client = client;
  setInterval(() => client.send({ action: 'stats' }), 1500);
  setInterval(() => {   // on the live step, also follow whatever game is running
    if (typeof step === 'undefined' || step !== LIVE_STEP) return;
    const n = LIVE.effect && LIVE.effect.name;
    if (n === 'charge' || n === 'powered') client.send({ action: 'charge' });
    if (n === 'tug' || n === 'tugwin') client.send({ action: 'tugstate' });
  }, 700);
  if (typeof window.EffectPlayer === 'function' && typeof window.QuizTV === 'function') {
    player = window.EffectPlayer(client); quiz = window.QuizTV(client);
    LIVE.quizFrame = () => { const f = player.frame(); LIVE.effect = f.effect; quiz.frame(f.effect); };
  }
})();
// ---------- live feed: real events become packets, numbers and log lines ----------
const LV = { prevPhones: null, prevCalls: null, prevNow: 0, runBudget: 0, runsSince: 0, runsT: 0, lit: 0, log: [], fireAt: 0, fireFx: null, rows: 0 };
const serverNow = () => (LIVE.client ? LIVE.client.serverNow() : Date.now());
const stampOf = (ms) => { const d = new Date(ms); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${Math.floor(d.getMilliseconds() / 100)}`; };
function logLine(txt) { LV.log.push({ t: serverNow(), txt }); if (LV.log.length > 7) LV.log.shift(); }
function liveStats(msg) {
  const phones = msg.phones || 0;
  LIVE.phones = phones; LV.rows = msg.rows || LV.rows;
  if (msg.calls != null) {
    if (LV.prevCalls != null && msg.now > LV.prevNow && msg.calls >= LV.prevCalls) {
      const d = msg.calls - LV.prevCalls;
      LIVE.rate = d / ((msg.now - LV.prevNow) / 1000);
      LV.runBudget = Math.min(400, LV.runBudget + d); LV.runsSince += d;
    }
    LV.prevCalls = msg.calls; LV.prevNow = msg.now; LIVE.calls = msg.calls;
  }
  if (LV.prevPhones != null && phones !== LV.prevPhones) {
    const d = phones - LV.prevPhones;
    if (d > 0) { logLine(`+${d} phone${d > 1 ? 's' : ''} joined → ${d} new row${d > 1 ? 's' : ''} in DynamoDB`); liveJoins(d); }
    else logLine(`${-d} phone${d < -1 ? 's' : ''} left · row${d < -1 ? 's' : ''} deleted`);
  }
  if (LV.prevPhones == null) LV.lit = Math.min(N, phones);
  LV.prevPhones = phones;
  liveTag(); liveText();
}
const FX_LABEL = { lobby: 'join countdown', charge: 'power-up', powered: 'full power', tug: 'tug of war', tugwin: 'tug of war result',
  backend: 'backend view', text: 'join link', off: 'all off', quiz: 'quiz', color: 'colour', wave: 'wave', rainbow: 'rainbow', countdown: 'countdown' };
function liveBroadcast(effect, at) {
  if (!effect) return;
  let label = FX_LABEL[effect.name] || effect.name;
  if (effect.name === 'quiz') label = effect.phase === 'done' ? 'quiz scores' : `quiz · ${effect.phase || 'ask'} question ${(effect.q || 0) + 1}`;
  if (effect.name === 'tugwin') return;   // sent by Lambda itself when the round ends
  logLine(`pressed "${label}" → ${fmt(LIVE.phones)} phones, fire at ${stampOf(at).slice(3)}`);
  LV.fireAt = at; LV.fireFx = effect;
  if (step !== LIVE_STEP) return;
  const leg = (a, b, k, next) => send(a, b, { dur: 0.16, arc: 0.5, mat: 'white', onArrive: () => { hit(k); if (k === 'lambda') lambdaHeat[0] = 1; next && next(); } });
  leg(P.you, P.gw, 'gw', () => leg(P.gw, P.lambda, 'lambda', () => leg(P.lambda, P.db, 'db', () =>
    leg(P.db, P.lambda, 'lambda', () => leg(P.lambda, P.gw, 'gw', () => {
      const lit = Math.max(1, LV.lit);
      for (let k = 0; k < lit; k++) send(P.gw, phonePt(PERM[k]), { dur: 0.3 + Math.random() * 0.25, arc: 1.1 });
    })))));
}
function liveJoins(d) {
  if (step !== LIVE_STEP) { LV.lit = Math.min(N, LIVE.phones); return; }
  const target = Math.min(N, LIVE.phones), anim = Math.min(30, target - LV.lit);
  LV.lit = Math.max(LV.lit, target - anim);      // the rest appear at once
  for (let k = 0; k < anim; k++) {
    const slot = PERM[Math.min(N - 1, LV.lit + k)];
    const from = phonePt(slot);
    send(from, GW_IN, { delay: k * 0.05, dur: 0.6, arc: 0.4, onArrive: () => { hit('gw');
      send(P.gw, P.lambda, { dur: 0.35, arc: 0.5, onArrive: () => { hit('lambda'); lambdaHeat[0] = 1;
        send(P.lambda, P.db, { dur: 0.35, arc: 0.6, onArrive: () => { hit('db'); LV.lit = Math.min(target, LV.lit + 1); } });
      } });
    } });
  }
}
// no backend (e.g. the preview link): a gentle made-up feed so the step still shows something
let simT = 0, simBT = 0, simPhones = 180, simCalls = 9000;
function simTick() {
  simT += dt; simBT += dt;
  if (simT >= 1.5) {
    simT = 0; simPhones = Math.min(300, simPhones + (Math.random() < 0.5 ? rnd(5) : 0)); simCalls += 20 + rnd(40);
    liveStats({ phones: simPhones, calls: simCalls, rows: simPhones + 4, now: Date.now() });
  }
  if (simBT >= 9) { simBT = 0; liveBroadcast({ name: ['wave', 'tug', 'color'][rnd(3)] }, Date.now() + 1200); }
}
function nowOnPhones() {
  const e = LIVE.effect, n = e && e.name;
  if (!LIVE.on) return 'simulation (not connected)';
  if (!n || n === 'off') return 'idle · waiting for my button';
  if (n === 'charge') { const c = LIVE.charge; return c ? `power-up ${Math.floor(c.level * 100)}% · ${fmt(c.tappers)} tapping` : 'power-up'; }
  if (n === 'tug') { const t = LIVE.tug; return t ? `tug of war · red ${fmt(t.a)} / blue ${fmt(t.b)}` : 'tug of war'; }
  if (n === 'tugwin') return `tug of war over · ${e.winner === 'draw' ? 'draw' : (e.winner === 'A' ? 'red' : 'blue') + ' won'}`;
  if (n === 'quiz') return `quiz · question ${(e.q || 0) + 1} · ${e.phase || 'ask'}`;
  return FX_LABEL[n] || n;
}
function updateLive() {
  if (!LIVE.on) simTick();
  // real Lambda runs since the last stats poll, spread out as packets (capped so the screen stays readable)
  const emit = Math.min(LV.runBudget, Math.max(1, LV.runBudget / 1.5) * dt, 45 * dt);
  LV.runAcc = (LV.runAcc || 0) + emit; LV.runBudget -= emit;
  while (LV.runAcc >= 1) {
    LV.runAcc -= 1;
    const slot = LV.lit ? PERM[rnd(LV.lit)] : rnd(N);
    send(phonePt(slot), GW_IN, { dur: 0.55, arc: 0.35, onArrive: () => { hit('gw');
      send(P.gw, P.lambda, { dur: 0.35, arc: 0.45, onArrive: () => { hit('lambda'); lambdaHeat[0] = 1;
        if (Math.random() < 0.6) send(P.lambda, P.db, { dur: 0.35, arc: 0.55, onArrive: () => hit('db') });
      } });
    } });
  }
  LV.runsT += dt;
  if (LV.runsT > 6 && LV.runsSince > 0) { logLine(`lambda ran ${fmt(LV.runsSince)} times in the last ${Math.round(LV.runsT)} s`); LV.runsSince = 0; LV.runsT = 0; }
  // connected phones glow; at the exact AWS time of a broadcast they all fire, together with the real phones
  for (let k = 0; k < N; k++) liveBase[PERM[k]] = k < LV.lit ? 0.2 : 0;
  if (LV.fireAt && serverNow() >= LV.fireAt) {
    const fx = LV.fireFx || {}; LV.fireAt = 0;
    if (fx.name !== 'off') for (let k = 0; k < LV.lit; k++) {
      const i = PERM[k]; phoneLevel[i] = 1;
      phoneTint[i] = fx.name === 'tug' ? (k % 2 ? C.blue : C.red) : C.accent;
    }
    hit('gw');
  }
  // the panel: counters + the log
  const pad = (a, w) => String(a).padStart(w);
  const lines = [
    `phones connected   ${pad(fmt(LIVE.phones), 9)}`,
    `lambda runs        ${pad(fmt(LIVE.calls || 0), 9)}   ${pad('+' + (LIVE.rate || 0).toFixed(1), 6)}/s`,
    `dynamodb rows      ${pad(fmt(LV.rows), 9)}`,
    `on the phones      ${nowOnPhones()}`,
    '',
    ...LV.log.map((l) => `[${stampOf(l.t)}] ${l.txt}`),
  ];
  const txt = lines.join('\n');
  if (hudBig.textContent !== txt) { hudBig.className = 'code live'; hudBig.textContent = txt; }
}

function liveTag() {
  const el = document.getElementById('live');
  if (el) el.innerHTML = LIVE.on ? `<b>&#9679;</b> live from aws · ${LIVE.region}` : 'simulation';
  document.body.classList.toggle('is-live', LIVE.on);
}
const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

// ---------- renderer, camera, scene ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
scene.fog = new THREE.Fog(C.bg, 24, 46);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight(0xffffff, 0x202024, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(5, 14, 9); scene.add(sun);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 4; sun.shadow.bias = -0.0008;
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 14, bottom: -14, near: 1, far: 40 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.ShadowMaterial({ opacity: 0.42 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const grid = new THREE.GridHelper(60, 60, C.ground, C.ground);
grid.position.y = -0.01; scene.add(grid);

function solid(geo, y = 0) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: C.body, roughness: 0.9, metalness: 0.05, emissive: C.accent, emissiveIntensity: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: C.edge }));
  mesh.position.y = y; edges.position.y = y; mesh.castShadow = true;
  g.add(mesh, edges);
  g.userData = { mat, edgeMat: edges.material, heat: 0, faces: [] };
  return g;
}
const tmpC = new THREE.Color(), ACCENT = new THREE.Color(C.accent), WHITE = new THREE.Color(0xffffff);
function warm(st, k) {   // k = 0..1 how "active" a station looks
  st.userData.mat.emissiveIntensity = 0.35 * k;
  st.userData.edgeMat.color.copy(tmpC.set(C.edge).lerp(ACCENT, k));
  for (const f of st.userData.faces) f.color.copy(tmpC.set(0x9a9aa0).lerp(WHITE, k));
}

// names printed on the blocks (canvas textures, redrawn once the font has loaded)
const faceJobs = [];
function face(part, text, w, h, { px = 120, weight = 500 } = {}) {
  const cv = document.createElement('canvas'); cv.width = Math.round(256 * w / h) * 2; cv.height = 512;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const draw = () => {
    const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${weight} ${px * 2}px "JetBrains Mono", ui-monospace, monospace`;
    g.fillText(text, cv.width / 2, cv.height / 2 + px * 0.08); tex.needsUpdate = true;
  };
  draw(); faceJobs.push(draw);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0x9a9aa0 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  part.add(m); part.userData.faces.push(mat);
  return m;
}
document.fonts && document.fonts.load('500 40px "JetBrains Mono"').then(() => faceJobs.forEach((f) => f()));

// stations
const ST = {};
// S3: a bucket
ST.s3 = new THREE.Group(); ST.s3.add(solid(new THREE.CylinderGeometry(1.05, 0.75, 1.5, 28, 1, true), 0.75), solid(new THREE.CylinderGeometry(0.75, 0.75, 0.02, 28), 0.01));
ST.s3.position.set(-14.2, 0, -2.6);
{ const f = face(ST.s3.children[0], 'S3', 1.1, 0.6, { px: 170 }); f.position.set(0, 0.82, 0.95); f.rotation.x = -0.17; } ST.s3.userData.parts = ST.s3.children; scene.add(ST.s3);
// API Gateway: an arch the traffic passes through
ST.gw = new THREE.Group();
ST.gw.add(solid(new THREE.BoxGeometry(0.5, 2.6, 0.5), 1.3)); ST.gw.children[0].position.z = -1.35;
ST.gw.add(solid(new THREE.BoxGeometry(0.5, 2.6, 0.5), 1.3)); ST.gw.children[1].position.z = 1.35;
ST.gw.add(solid(new THREE.BoxGeometry(0.7, 0.45, 3.3), 2.8));
ST.gw.position.set(-3, 0, 0);
{ const f = face(ST.gw.children[2], 'API GATEWAY', 3.0, 0.36, { px: 110 }); f.position.set(-0.36, 2.8, 0); f.rotation.y = -Math.PI / 2; } ST.gw.userData.parts = ST.gw.children; scene.add(ST.gw);
// Lambda: a block (copies appear when scaling)
const lambdaGeo = new THREE.BoxGeometry(1.5, 1.9, 1.5);
ST.lambda = new THREE.Group();
const lambdas = [];
for (let i = 0; i < 8; i++) {
  const b = solid(lambdaGeo, 0.95);
  const ang = (i - 1) / 7 * Math.PI * 2;
  b.position.set(i === 0 ? 0 : Math.cos(ang) * 2.4, 0, i === 0 ? 0 : Math.sin(ang) * 2.4);
  b.visible = i === 0; b.userData.target = i === 0 ? 1 : 0; b.scale.setScalar(i === 0 ? 1 : 0.001);
  { const f = face(b, '\u03bb', 1.1, 1.1, { px: 190 }); f.position.set(0, 0.95, 0.76); }
  ST.lambda.add(b); lambdas.push(b);
}
ST.lambda.position.set(2.6, 0, 0); ST.lambda.userData.parts = [lambdas[0]]; scene.add(ST.lambda);
// DynamoDB: the classic stack of disks
ST.db = new THREE.Group();
for (let i = 0; i < 4; i++) ST.db.add(solid(new THREE.CylinderGeometry(1.1, 1.1, 0.42, 36), 0.25 + i * 0.55));
{ const f = face(ST.db.children[3], 'DynamoDB', 1.6, 0.4, { px: 120 }); f.position.set(0, 1.92, 0); f.rotation.x = -Math.PI / 2; }
ST.db.position.set(8.2, 0, 0); ST.db.userData.parts = ST.db.children; scene.add(ST.db);
// you: the control phone
ST.you = solid(new THREE.BoxGeometry(0.55, 0.08, 0.95), 0.05);
ST.you.position.set(-5.4, 0, 4.4); warm(ST.you, 1); scene.add(ST.you);

// the audience: 300 phones as one instanced mesh
const COLS = 20, ROWS = 15, N = COLS * ROWS;
const phoneGeo = new THREE.BoxGeometry(0.2, 0.05, 0.33);
const phoneMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
const phones = new THREE.InstancedMesh(phoneGeo, phoneMat, N);
const PHONE_POS = [];
const PH_CENTER = new THREE.Vector3(-9.2, 0, 0.2);
{
  const m = new THREE.Matrix4();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = new THREE.Vector3(PH_CENTER.x + (c - (COLS - 1) / 2) * 0.31, 0.03, PH_CENTER.z + (r - (ROWS - 1) / 2) * 0.42);
    PHONE_POS.push(p); m.makeTranslation(p.x, p.y, p.z); phones.setMatrixAt(r * COLS + c, m);
  }
}
scene.add(phones);
const phoneLevel = new Float32Array(N);       // 0..1 brightness
const liveBase = new Float32Array(N);         // resting glow of connected phones on the live step
const PERM = (() => { const a = [...Array(N).keys()]; let x = 7; for (let i = N - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor(x / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
const phoneTint = new Array(N).fill(C.accent); // colour when lit
function paintPhones() {
  const base = new THREE.Color(C.phone), col = new THREE.Color();
  for (let i = 0; i < N; i++) { col.copy(base).lerp(tmpC.set(phoneTint[i]), phoneLevel[i]); phones.setColorAt(i, col); }
  phones.instanceColor.needsUpdate = true;
}

// websocket lines from (a sample of) phones to the gateway
const GW_IN = new THREE.Vector3(-3, 1.4, 0);
const lineSample = Array.from({ length: 70 }, (_, k) => Math.floor(k * N / 70 + (k % 3)));
const lineGeo = new THREE.BufferGeometry();
{
  const pts = [];
  lineSample.forEach((i) => { const p = PHONE_POS[i]; pts.push(p.x, p.y + 0.05, p.z, GW_IN.x, GW_IN.y, GW_IN.z); });
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
}
const lineMat = new THREE.LineBasicMaterial({ color: C.accent, transparent: true, opacity: 0 });
scene.add(new THREE.LineSegments(lineGeo, lineMat));

// ---------- packets: little orange spheres flying along arcs ----------
const PKT_MAT = { accent: new THREE.MeshBasicMaterial({ color: C.accent }), red: new THREE.MeshBasicMaterial({ color: C.red }),
  blue: new THREE.MeshBasicMaterial({ color: C.blue }), white: new THREE.MeshBasicMaterial({ color: C.white }) };
const pktGeo = new THREE.SphereGeometry(0.075, 12, 8);
const pool = [], live = [];
for (let i = 0; i < 700; i++) { const m = new THREE.Mesh(pktGeo, PKT_MAT.accent); m.visible = false; scene.add(m); pool.push(m); }
function send(from, to, { dur = 0.9, arc = 1.0, mat = 'accent', delay = 0, onArrive = null } = {}) {
  const mesh = pool.pop(); if (!mesh) return;
  mesh.material = PKT_MAT[mat];
  mesh.scale.set(1, 1, 1);
  live.push({ seen: false, mesh, a: from.clone(), b: to.clone(), t: -delay, dur, arc, onArrive });
}
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
function stepPackets(dtp) {
  for (let i = live.length - 1; i >= 0; i--) {
    const p = live[i]; p.t += dtp;
    if (p.t < 0) { p.mesh.visible = false; continue; }
    const u = Math.min(1, p.t / p.dur);
    v1.lerpVectors(p.a, p.b, 0.5); v1.y += p.arc;          // control point
    const a = 1 - u;
    v2.copy(p.mesh.position);
    p.mesh.position.set(a * a * p.a.x + 2 * a * u * v1.x + u * u * p.b.x, a * a * p.a.y + 2 * a * u * v1.y + u * u * p.b.y, a * a * p.a.z + 2 * a * u * v1.z + u * u * p.b.z);
    p.mesh.visible = true;
    const sp = v2.distanceTo(p.mesh.position) / Math.max(dt, 1e-4);
    if (sp > 0.01 && p.seen) { v2.sub(p.mesh.position).negate().add(p.mesh.position); p.mesh.lookAt(v2); p.mesh.scale.set(0.85, 0.85, 1 + Math.min(1.6, sp * 0.07)); }
    p.seen = true;
    if (u >= 1) { p.mesh.visible = false; pool.push(p.mesh); live.splice(i, 1); p.onArrive && p.onArrive(); }
  }
}
function clearPackets() { for (const p of live) { p.mesh.visible = false; pool.push(p.mesh); } live.length = 0; }

// anchor points
const P = {
  s3: new THREE.Vector3(-14.2, 1.5, -2.6), gw: new THREE.Vector3(-3, 1.5, 0), lambda: new THREE.Vector3(2.6, 1.0, 0),
  db: new THREE.Vector3(8.2, 1.2, 0), you: new THREE.Vector3(-5.4, 0.1, 4.4),
};
const heat = { s3: 0, gw: 0, lambda: 0, db: 0 };
const hit = (k) => { heat[k] = 1; };
const lambdaHeat = new Float32Array(8);

// ---------- HTML labels pinned to 3D points ----------
const LABELS = {
  phones: { at: new THREE.Vector3(-9.2, 0.35, -3.3), html: '<b>your phones</b><span>the browser</span>' },
  s3: { at: new THREE.Vector3(-14.2, 2.3, -2.6), html: '<b>Amazon S3</b><span>the menu · stores the page</span>' },
  gw: { at: new THREE.Vector3(-3, 3.5, 0), html: '<b>API Gateway</b><span>the waiter · open lines</span>' },
  lambda: { at: new THREE.Vector3(2.6, 2.5, 0), html: '<b>AWS Lambda</b><span>the chef · my code</span>' },
  db: { at: new THREE.Vector3(8.2, 2.7, 0), html: '<b>DynamoDB</b><span>the fridge · remembers</span>' },
  you: { at: new THREE.Vector3(-5.4, 0.6, 4.4), html: '<b>my button</b><span>control panel</span>' },
};
const labelLayer = document.getElementById('labels');
for (const [k, L] of Object.entries(LABELS)) {
  const d = document.createElement('div'); d.className = 'lbl'; d.innerHTML = L.html; labelLayer.appendChild(d); L.el = d;
}
const hudBig = document.getElementById('big');
const setSub = (k, txt) => { const sp = LABELS[k].el.querySelector('span'); if (sp && sp.textContent !== txt) sp.textContent = txt; };
const BASE_SUB = { phones: 'the browser', s3: 'the menu · stores the page', gw: 'the waiter · open lines', lambda: 'the chef · my code', db: 'the fridge · remembers', you: 'control panel' };
function liveText() {   // labels carry real numbers whenever the backend is connected
  if (!LIVE.on) return;
  setSub('phones', `${fmt(LIVE.phones)} connected right now`);
  if (LIVE.calls != null) setSub('lambda', `${fmt(LIVE.calls)} runs · ${LIVE.rate.toFixed(1)}/s`);
  if (step !== 4 && step !== 7) setSub('db', `the fridge · ${fmt(LIVE.phones)} phone rows`);

}

// headline types itself in, like a terminal
let typed = { full: '', n: 0, t: 0 };
function setHeadline(text, retype = false) {
  if (!retype && text === typed.full) return;
  if (!retype && typed.n >= typed.full.length) { typed = { full: text, n: text.length, t: 0 }; drawHeadline(); return; }
  const n = retype ? 0 : Math.min(typed.n, text.length);
  typed = { full: text, n, t: n * 0.028 };
}
function drawHeadline() {
  const h = document.getElementById('h');
  const done = typed.n >= typed.full.length;
  h.innerHTML = typed.full.slice(0, typed.n).replace(/&/g, '&amp;').replace(/</g, '&lt;') + (done ? '' : '<span class="cur">_</span>');
}
function updateTyping() {
  if (typed.n >= typed.full.length) return;
  typed.t += dt; const k = Math.floor(typed.t / 0.028);
  if (k > typed.n) { typed.n = Math.min(typed.full.length, k); drawHeadline(); }
}

// join QR on the last step (from show-config.js; hidden while the link is still a placeholder)
const JOIN = (window.SHOW && window.SHOW.joinUrl && !/REPLACE-ME/.test(window.SHOW.joinUrl)) ? window.SHOW.joinUrl : '';
if (JOIN && typeof window.qrcode === 'function') {
  try { const q = window.qrcode(0, 'M'); q.addData(JOIN); q.make();
    document.getElementById('qrimg').innerHTML = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
    document.getElementById('qrurl').textContent = JOIN.replace(/^https?:\/\//, ''); } catch (e) { /* no QR */ }
}

// ---------- steps: what plays while each one is on screen ----------
let step = 0, stepT = 0, timers = {};
const every = (key, period, fn) => { timers[key] = (timers[key] ?? period) + dt; if (timers[key] >= period) { timers[key] = 0; fn(); } };
let dt = 0;
const rnd = (n) => Math.floor(Math.random() * n);
const phonePt = (i) => PHONE_POS[i].clone().add(new THREE.Vector3(0, 0.08, 0));
let counts = { red: 0, blue: 0, rows: 0 }, fired = false, fireAt = 0, buildT = -1;

function enterStep(i) {
  step = (i + STEPS.length) % STEPS.length; stepT = 0; timers = {};
  clearPackets(); fired = false; hudBig.textContent = ''; hudBig.className = '';
  phoneLevel.fill(0); phoneTint.fill(C.accent);
  lambdas.forEach((b, k) => { b.userData.target = k === 0 ? 1 : 0; });
  counts = { red: 0, blue: 0, rows: step >= 4 ? 300 : 0 };
  buildT = step === 8 ? 0 : -1;
  const S = STEPS[step];
  ST.you.visible = [0, 5, LIVE_STEP, STEPS.length - 1].includes(step);
  document.body.classList.toggle('step-live', step === LIVE_STEP);
  liveBase.fill(0); if (step === LIVE_STEP) { LV.lit = Math.min(N, LIVE.phones); LV.runBudget = 0; }
  document.getElementById('kicker').textContent = S.kicker;
  setHeadline(S.h, true); liveText();
  document.getElementById('qr').classList.toggle('on', step === STEPS.length - 1 && !!JOIN);
  for (const k of Object.keys(BASE_SUB)) if (!LIVE.on || k === 's3' || k === 'gw' || k === 'you') setSub(k, BASE_SUB[k]);
  liveText();
  document.getElementById('p').textContent = S.p;
  document.getElementById('count').textContent = `${String(step).padStart(2, '0')} / ${String(STEPS.length - 1).padStart(2, '0')}`;
  document.querySelectorAll('#ticks i').forEach((t, k) => t.classList.toggle('on', k <= step));
  camFrom.copy(camera.position); atFrom.copy(curAt);
  camTo.set(...S.cam); atTo.set(...S.at); camT = 0;
  const txt = document.getElementById('text'); txt.classList.remove('in'); void txt.offsetWidth; txt.classList.add('in');
}

function updateStep() {
  const t = stepT;
  switch (step) {
    case 0: // gentle idle: random phones blink, slow orbit
      every('blink', 0.08, () => { phoneLevel[rnd(N)] = 0.8; });
      break;
    case 1: // S3 sends the page to phones
      every('page', 0.12, () => { const i = rnd(N); hit('s3'); send(P.s3, phonePt(i), { dur: 1.1, arc: 1.4, onArrive: () => { phoneLevel[i] = Math.max(phoneLevel[i], 0.35); } }); });
      break;
    case 2: // lines open, a heartbeat travels along some of them
      lineMat.opacity = Math.min(0.32, t * 0.25);
      every('beat', 0.25, () => { const i = lineSample[rnd(lineSample.length)]; send(phonePt(i), GW_IN, { dur: 0.9, arc: 0.3, onArrive: () => hit('gw') }); });
      for (const i of lineSample) phoneLevel[i] = 0.35;
      break;
    case 3: // phone -> gateway -> lambda wakes up
      every('msg', 0.7, () => { const i = rnd(N); send(phonePt(i), GW_IN, { dur: 0.8, arc: 0.4, onArrive: () => { hit('gw'); send(P.gw, P.lambda, { dur: 0.6, arc: 0.6, onArrive: () => { hit('lambda'); lambdaHeat[0] = 1; } }); } }); });
      break;
    case 4: // lambda writes rows into dynamodb
      every('row', 0.35, () => { hit('lambda'); lambdaHeat[0] = 1; send(P.lambda, P.db, { dur: 0.7, arc: 0.7, onArrive: () => { hit('db'); counts.rows = Math.min(300, counts.rows + 1); } }); });
      if (t < 0.05) counts.rows = 287;
      setSub('db', `the fridge · ${LIVE.on ? fmt(LIVE.phones) : counts.rows} rows`);
      break;
    case 5: { // the button: you -> gw -> lambda -> db (read) -> lambda -> gw -> every phone
      const loop = 7, lt = t % loop;
      if (lt < dt * 1.5 && t > 0.3) {
        phoneLevel.fill(0);
        send(P.you, P.gw, { dur: 0.7, arc: 0.6, mat: 'white', onArrive: () => { hit('gw');
          send(P.gw, P.lambda, { dur: 0.5, arc: 0.5, mat: 'white', onArrive: () => { hit('lambda'); lambdaHeat[0] = 1;
            send(P.lambda, P.db, { dur: 0.45, arc: 0.6, mat: 'white', onArrive: () => { hit('db');
              send(P.db, P.lambda, { dur: 0.45, arc: 0.6, onArrive: () => { hit('lambda'); lambdaHeat[0] = 1;
                send(P.lambda, P.gw, { dur: 0.45, arc: 0.5, onArrive: () => { hit('gw');
                  for (let i = 0; i < N; i++) send(P.gw, phonePt(i), { dur: 0.8 + Math.random() * 0.25, arc: 1.2, onArrive: () => { phoneLevel[i] = 1; } });
                } });
              } });
            } });
          } });
        } });
      }
      if (lt > 5.4) for (let i = 0; i < N; i++) phoneLevel[i] *= 0.97;
      break;
    }
    case 6: { // arrive at different times, fire together
      const loop = 6, lt = t % loop;
      if (lt < dt * 1.5) {
        phoneLevel.fill(0); fired = false; fireAt = t + 3.2;
        for (let i = 0; i < N; i++) send(P.gw, phonePt(i), { dur: 0.6 + Math.random() * 2.1, arc: 1.6, onArrive: () => { if (!fired) phoneLevel[i] = 0.28; } });
      }
      const now = new Date(Date.now() + (fireAt - t) * 1000);
      const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${Math.floor(now.getMilliseconds() / 100)}`;
      if (!fired && t >= fireAt) { fired = true; phoneLevel.fill(1); }
      if (fired && t > fireAt + 1.5) for (let i = 0; i < N; i++) phoneLevel[i] *= 0.96;
      hudBig.className = fired ? 'fired' : '';
      const clk = LIVE.on && LIVE.rtt != null ? `\nthis laptop is ${Math.abs(Math.round(LIVE.offset))} ms ${LIVE.offset >= 0 ? 'behind' : 'ahead of'} AWS · corrected` : '';
      hudBig.textContent = fired ? 'fired together' : `waiting · fire at ${stamp}${clk}`;
      break;
    }
    case 7: { // tug of war: half red half blue, lambda copies multiply
      for (let i = 0; i < N; i++) { phoneTint[i] = i % 2 ? C.red : C.blue; phoneLevel[i] = 0.55; }
      const copies = Math.min(8, 1 + Math.floor(t / 0.7));
      lambdas.forEach((b, k) => { b.userData.target = k < copies ? 1 : 0; });
      every('tap', 0.025, () => {
        const i = rnd(N), red = i % 2 === 1, k = rnd(copies);
        const target = new THREE.Vector3().copy(ST.lambda.position).add(lambdas[k].position).setY(1.0);
        send(phonePt(i), GW_IN, { dur: 0.7, arc: 0.4, mat: red ? 'red' : 'blue', onArrive: () => { hit('gw');
          send(P.gw, target, { dur: 0.45, arc: 0.4, mat: red ? 'red' : 'blue', onArrive: () => { lambdaHeat[k] = 1;
            send(target, P.db, { dur: 0.5, arc: 0.6, mat: red ? 'red' : 'blue', onArrive: () => { hit('db'); counts[red ? 'red' : 'blue'] += 4; } });
          } });
        } });
      });
      setSub('db', `red ${fmt(counts.red)} · blue ${fmt(counts.blue)}`);
      hudBig.className = 'small';
      hudBig.textContent = `lambda copies running: ${copies}`;
      break;
    }
    case 8: // stations drop in one by one, built from the template
      break;
    case LIVE_STEP:
      updateLive();
      break;
    case 10: // wide shot, everything quietly alive
      every('blink', 0.05, () => { phoneLevel[rnd(N)] = 1; });
      every('msg', 0.3, () => { const i = rnd(N); send(phonePt(i), GW_IN, { dur: 0.8, arc: 0.4, onArrive: () => { hit('gw'); send(P.gw, P.lambda, { dur: 0.5, onArrive: () => { hit('lambda'); lambdaHeat[0] = 1; } }); } }); });
      break;
  }
  if (step !== 2) lineMat.opacity = Math.max(0, lineMat.opacity - dt * 0.8);

}

// infrastructure-as-code build-up (step 8)
const BUILD = ['s3', 'gw', 'lambda', 'db'];
function updateBuild() {
  BUILD.forEach((k, idx) => {
    const g = ST[k];
    if (buildT < 0) { g.position.y = 0; g.scale.setScalar(1); return; }
    const local = Math.max(0, Math.min(1, (buildT - 0.4 - idx * 0.55) / 0.6));
    const e = 1 - Math.pow(1 - local, 3);
    g.position.y = (1 - e) * 5; g.scale.setScalar(Math.max(0.001, e));
    if (local > 0 && local < 1) heat[k] = 1;
  });
  if (buildT >= 0) {
    buildT += dt;
    const lines = [`# template.yaml · ${TEMPLATE_LINES} lines`, 'Resources:', '  SiteBucket:      AWS::S3::Bucket', '  ShowApi:         AWS::ApiGatewayV2::Api', '  ShowFunction:    AWS::Serverless::Function', '  ConnectionsTable: AWS::DynamoDB::Table'];
    const shown = Math.min(lines.length, 2 + Math.floor((buildT - 0.1) / 0.55));
    hudBig.className = 'code';
    hudBig.textContent = lines.slice(0, Math.max(1, shown)).join('\n');
    if (buildT > 6) buildT = 0;   // replay while you talk
  }
}

// ---------- camera tween ----------
const camFrom = new THREE.Vector3(0, 14, 22), camTo = new THREE.Vector3(), atFrom = new THREE.Vector3(), atTo = new THREE.Vector3(), curAt = new THREE.Vector3();
let camT = 1;
camera.position.set(0, 14, 22);
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
function updateCamera() {
  camT = Math.min(1, camT + dt / 1.7);
  const e = ease(camT);
  camera.position.lerpVectors(camFrom, camTo, e);
  camera.position.x += Math.sin(stepT * 0.23) * 0.35 * e; camera.position.y += Math.sin(stepT * 0.17) * 0.18 * e;
  curAt.lerpVectors(atFrom, atTo, e);
  if (step === 0 && camT >= 1) {             // slow orbit on the title
    const a = stepT * 0.06;
    camera.position.set(Math.sin(a) * 20 - 2, 11.5, Math.cos(a) * 20);
  }
  camera.lookAt(step === 0 && camT >= 1 ? atTo : curAt);
}

// ---------- labels follow their 3D points ----------
const proj = new THREE.Vector3();
function updateLabels() {
  const vis = new Set(STEPS[step].labels);
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  for (const [k, L] of Object.entries(LABELS)) {
    proj.copy(L.at); if (k !== 'phones' && k !== 'you' && ST[k]) proj.y += ST[k].position.y;
    proj.project(camera);
    const on = vis.has(k) && proj.z < 1;
    L.el.style.opacity = on ? 1 : 0;
    L.el.style.transform = `translate(${(proj.x * 0.5 + 0.5) * w}px, ${(-proj.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
  }
}

// ---------- main loop ----------
const clock = new THREE.Clock();
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.setViewOffset(w, h, 0, h * 0.11, w, h);   // lift the scene so the text block below stays clear
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();
function frame() {
  dt = Math.min(0.05, clock.getDelta()); stepT += dt;
  if (LIVE.quizFrame) LIVE.quizFrame();
  updateStep(); updateBuild(); stepPackets(dt); updateTyping();
  for (const k of Object.keys(heat)) { heat[k] = Math.max(0, heat[k] - dt * 2.2); ST[k].userData.parts.forEach((p) => p.userData.mat && warm(p, heat[k])); }
  lambdas.forEach((b, k) => {
    lambdaHeat[k] = Math.max(0, lambdaHeat[k] - dt * 2.2); warm(b, Math.max(lambdaHeat[k], k === 0 ? heat.lambda : 0));
    const s = b.scale.x + (b.userData.target - b.scale.x) * Math.min(1, dt * 6);
    b.scale.setScalar(Math.max(0.001, s)); b.visible = s > 0.01;
  });
  if (step !== 6 && step !== 5) for (let i = 0; i < N; i++) phoneLevel[i] = Math.max(step === 7 ? phoneLevel[i] : liveBase[i], phoneLevel[i] - dt * (step === LIVE_STEP ? 0.9 : 0.6));
  if (step !== LIVE_STEP && step !== 7) for (let i = 0; i < N; i++) if (phoneTint[i] !== C.accent && phoneLevel[i] < 0.01) phoneTint[i] = C.accent;
  paintPhones();
  updateCamera(); updateLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- controls: arrows, space, presenter clicker, click ----------
document.querySelectorAll('#ticks').forEach((el) => { el.innerHTML = STEPS.map(() => '<i></i>').join(''); });
window.addEventListener('keydown', (e) => {
  if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); enterStep(step + 1); }
  else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); enterStep(step - 1); }
  else if (e.key === 'Home') enterStep(0);
  else if (e.key === 'End') enterStep(STEPS.length - 1);
  else if (e.key === 'l' || e.key === 'L') enterStep(LIVE_STEP);
  else if (e.key === 'f') document.documentElement.requestFullscreen?.();
  else if (/^[0-9]$/.test(e.key)) enterStep(Number(e.key));
});
canvas.addEventListener('click', (e) => enterStep(step + (e.clientX > window.innerWidth / 3 ? 1 : -1)));
enterStep(0);
camFrom.set(0, 14, 22);
requestAnimationFrame(frame);
window.__explain = { go: enterStep };
