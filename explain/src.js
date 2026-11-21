// 3D explainer for the light show: one scene, ten steps, camera moves between them.
// Built with three.js (MIT). Bundled to web/explain.js by explain/build.sh.
import * as THREE from 'three';

// ---------- look: the terminal direction (graphite, one AWS-orange accent) ----------
const C = {
  bg: 0x0f0f10, ground: 0x1d1d20, body: 0x1f1f22, edge: 0x6e6e74, edgeDim: 0x3a3a3f,
  accent: 0xff9900, red: 0xe5484d, blue: 0x3e8bff, phone: 0x2c2c31, white: 0xededed,
};
const STEPS = [
  { kicker: 'aws cloud club · rgu', h: '300 phones, one button', p: 'What actually happened when you tapped. Five pieces, zero servers to manage.', cam: [-2, 11.5, 20], at: [-2, 0.4, 0], labels: ['phones', 's3', 'gw', 'lambda', 'db'] },
  { kicker: '01 · the menu', h: 'Your phone opened a page from S3', p: 'Amazon S3 stores the website as plain files. Scanning the QR code just downloads them, nothing is running.', cam: [-15.5, 7.5, 9.5], at: [-11.2, 0.6, 0.6], labels: ['phones', 's3'] },
  { kicker: '02 · the waiter', h: 'Every phone keeps a line open', p: 'API Gateway holds one WebSocket per phone, so AWS can send you something at any moment without you asking.', cam: [-8, 8, 12.5], at: [-5.8, 1.1, 0.4], labels: ['phones', 'gw'] },
  { kicker: '03 · the chef', h: 'Each message wakes my code', p: 'AWS Lambda runs my code only when a message arrives, for a few milliseconds. No message: nothing running, nothing to pay.', cam: [0.2, 6, 10], at: [0.2, 1.7, 0], labels: ['gw', 'lambda'] },
  { kicker: '04 · the fridge', h: 'DynamoDB remembers who is here', p: 'Lambda forgets everything between runs, so the database is its memory: one row for every phone in this room.', cam: [5.6, 5.5, 8.5], at: [5.6, 0.9, 0], labels: ['lambda', 'db'] },
  { kicker: '05 · one button', h: 'One press reaches every phone', p: 'My button goes to Lambda. Lambda reads every row and sends one message per phone, all in under a second.', cam: [-1, 11, 15], at: [-1, 0.2, 0.5], labels: ['you', 'phones', 'gw', 'lambda', 'db'] },
  { kicker: '06 · the same moment', h: 'Fire at the same instant, not on arrival', p: 'Messages land at slightly different times. Every phone synced its clock with AWS, so they all wait and fire together.', cam: [-10, 9.5, 11], at: [-10.4, 0, 1.4], labels: [] },
  { kicker: '07 · scaling', h: '300 people tapping at once', p: 'AWS starts more copies of the chef by itself. The database adds every pull in one unbreakable step, so none are lost.', cam: [-0.5, 9, 14], at: [0, 0.6, 0], labels: ['phones', 'gw', 'lambda', 'db'] },
  { kicker: '08 · infrastructure as code', h: 'All of this is one text file', p: 'I described the five pieces in a template. AWS built them in about three minutes, and one command deletes them.', cam: [-2.5, 12, 19], at: [-2.5, 0.6, 0], labels: ['s3', 'gw', 'lambda', 'db'] },
  { kicker: '09 · the bill', h: 'Servers I manage: 0', p: 'All of tonight cost less than a cup of chai. Want to build this yourself? That is what the AWS Cloud Club is for.', cam: [-2.5, 15, 25], at: [-2.5, 0, 0], labels: ['phones', 's3', 'gw', 'lambda', 'db'] },
];

// ---------- renderer, camera, scene ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
scene.fog = new THREE.Fog(C.bg, 24, 46);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight(0xffffff, 0x202024, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(6, 12, 8); scene.add(sun);

const grid = new THREE.GridHelper(60, 60, C.ground, C.ground);
grid.position.y = -0.01; scene.add(grid);

function solid(geo, y = 0) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: C.body, roughness: 0.9, metalness: 0.05, emissive: C.accent, emissiveIntensity: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: C.edge }));
  mesh.position.y = y; edges.position.y = y;
  g.add(mesh, edges);
  g.userData = { mat, edgeMat: edges.material, heat: 0 };
  return g;
}
const tmpC = new THREE.Color();
function warm(st, k) {   // k = 0..1 how "active" a station looks
  st.userData.mat.emissiveIntensity = 0.35 * k;
  st.userData.edgeMat.color.copy(tmpC.set(C.edge).lerp(new THREE.Color(C.accent), k));
}

// stations
const ST = {};
// S3: a bucket
ST.s3 = new THREE.Group(); ST.s3.add(solid(new THREE.CylinderGeometry(1.05, 0.75, 1.5, 28, 1, true), 0.75), solid(new THREE.CylinderGeometry(0.75, 0.75, 0.02, 28), 0.01));
ST.s3.position.set(-14.2, 0, -2.6); ST.s3.userData.parts = ST.s3.children; scene.add(ST.s3);
// API Gateway: an arch the traffic passes through
ST.gw = new THREE.Group();
ST.gw.add(solid(new THREE.BoxGeometry(0.5, 2.6, 0.5), 1.3)); ST.gw.children[0].position.z = -1.35;
ST.gw.add(solid(new THREE.BoxGeometry(0.5, 2.6, 0.5), 1.3)); ST.gw.children[1].position.z = 1.35;
ST.gw.add(solid(new THREE.BoxGeometry(0.7, 0.45, 3.3), 2.8));
ST.gw.position.set(-3, 0, 0); ST.gw.userData.parts = ST.gw.children; scene.add(ST.gw);
// Lambda: a block (copies appear when scaling)
const lambdaGeo = new THREE.BoxGeometry(1.5, 1.9, 1.5);
ST.lambda = new THREE.Group();
const lambdas = [];
for (let i = 0; i < 8; i++) {
  const b = solid(lambdaGeo, 0.95);
  const ang = (i - 1) / 7 * Math.PI * 2;
  b.position.set(i === 0 ? 0 : Math.cos(ang) * 2.4, 0, i === 0 ? 0 : Math.sin(ang) * 2.4);
  b.visible = i === 0; b.userData.target = i === 0 ? 1 : 0; b.scale.setScalar(i === 0 ? 1 : 0.001);
  ST.lambda.add(b); lambdas.push(b);
}
ST.lambda.position.set(2.6, 0, 0); ST.lambda.userData.parts = [lambdas[0]]; scene.add(ST.lambda);
// DynamoDB: the classic stack of disks
ST.db = new THREE.Group();
for (let i = 0; i < 4; i++) ST.db.add(solid(new THREE.CylinderGeometry(1.1, 1.1, 0.42, 36), 0.25 + i * 0.55));
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
  live.push({ mesh, a: from.clone(), b: to.clone(), t: -delay, dur, arc, onArrive });
}
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
function stepPackets(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const p = live[i]; p.t += dt;
    if (p.t < 0) { p.mesh.visible = false; continue; }
    const u = Math.min(1, p.t / p.dur);
    v1.lerpVectors(p.a, p.b, 0.5); v1.y += p.arc;          // control point
    const a = 1 - u;
    p.mesh.position.set(a * a * p.a.x + 2 * a * u * v1.x + u * u * p.b.x, a * a * p.a.y + 2 * a * u * v1.y + u * u * p.b.y, a * a * p.a.z + 2 * a * u * v1.z + u * u * p.b.z);
    p.mesh.visible = true;
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
  db: { at: new THREE.Vector3(8.2, 2.7, 0), html: '<b>DynamoDB</b><span id="dbsub">the fridge · remembers</span>' },
  you: { at: new THREE.Vector3(-5.4, 0.6, 4.4), html: '<b>my button</b><span>control panel</span>' },
};
const labelLayer = document.getElementById('labels');
for (const [k, L] of Object.entries(LABELS)) {
  const d = document.createElement('div'); d.className = 'lbl'; d.innerHTML = L.html; labelLayer.appendChild(d); L.el = d;
}
const hudBig = document.getElementById('big');

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
  ST.you.visible = [0, 5, 9].includes(step);
  document.getElementById('kicker').textContent = S.kicker;
  document.getElementById('h').textContent = S.h;
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
      document.getElementById('dbsub').textContent = `the fridge · ${counts.rows} rows`;
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
      hudBig.textContent = fired ? 'fired together' : `waiting · fire at ${stamp}`;
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
      document.getElementById('dbsub').textContent = `red ${counts.red.toLocaleString('en-IN')} · blue ${counts.blue.toLocaleString('en-IN')}`;
      hudBig.className = 'small';
      hudBig.textContent = `lambda copies running: ${copies}`;
      break;
    }
    case 8: // stations drop in one by one, built from the template
      break;
    case 9: // wide shot, everything quietly alive
      every('blink', 0.05, () => { phoneLevel[rnd(N)] = 1; });
      every('msg', 0.3, () => { const i = rnd(N); send(phonePt(i), GW_IN, { dur: 0.8, arc: 0.4, onArrive: () => { hit('gw'); send(P.gw, P.lambda, { dur: 0.5, onArrive: () => { hit('lambda'); lambdaHeat[0] = 1; } }); } }); });
      break;
  }
  if (step !== 2) lineMat.opacity = Math.max(0, lineMat.opacity - dt * 0.8);
  if (step !== 4 && step !== 7) document.getElementById('dbsub').textContent = 'the fridge · remembers';
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
    const lines = ['Resources:', '  SiteBucket:      AWS::S3::Bucket', '  ShowApi:         AWS::ApiGatewayV2::Api', '  ShowFunction:    AWS::Serverless::Function', '  ConnectionsTable: AWS::DynamoDB::Table'];
    const shown = Math.min(lines.length, 1 + Math.floor((buildT - 0.1) / 0.55));
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
  updateStep(); updateBuild(); stepPackets(dt);
  for (const k of Object.keys(heat)) { heat[k] = Math.max(0, heat[k] - dt * 2.2); ST[k].userData.parts.forEach((p) => p.userData.mat && warm(p, heat[k])); }
  lambdas.forEach((b, k) => {
    lambdaHeat[k] = Math.max(0, lambdaHeat[k] - dt * 2.2); warm(b, Math.max(lambdaHeat[k], k === 0 ? heat.lambda : 0));
    const s = b.scale.x + (b.userData.target - b.scale.x) * Math.min(1, dt * 6);
    b.scale.setScalar(Math.max(0.001, s)); b.visible = s > 0.01;
  });
  if (step !== 6 && step !== 5) for (let i = 0; i < N; i++) phoneLevel[i] = Math.max(step === 7 ? phoneLevel[i] : 0, phoneLevel[i] - dt * 0.6);
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
  else if (e.key === 'f') document.documentElement.requestFullscreen?.();
  else if (/^[0-9]$/.test(e.key)) enterStep(Number(e.key));
});
canvas.addEventListener('click', (e) => enterStep(step + (e.clientX > window.innerWidth / 3 ? 1 : -1)));
enterStep(0);
camFrom.set(0, 14, 22);
requestAnimationFrame(frame);
window.__explain = { go: enterStep };
