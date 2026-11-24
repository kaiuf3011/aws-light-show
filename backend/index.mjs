// 300 Phones, One Button — the Lambda "chef".
// One function handles every WebSocket route: $connect, $disconnect and $default.
// Messages from browsers look like { action: "join" | "sync" | "stats" | "cmd" | "tap" | "charge" | "tug" | "tugstate" | "answer" | "quizstate", ... }.

import { DynamoDBClient, PutItemCommand, DeleteItemCommand, ScanCommand, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

const db = new DynamoDBClient({});
const TABLE = process.env.TABLE;
const ADMIN_KEY = process.env.ADMIN_KEY;

// Effects start this long after the button press, so every phone gets the
// message first and then they all fire at the same instant (server time).
const LEAD_MS = 1200;
const BATCH = 200;
const META = '#charge'; // the power-up meter lives in the same table under this key
const TUG = '#tug';      // the tug-of-war score lives here
const METRICS = '#metrics';
const QUIZ = '#quiz';      // the live quiz: current question, answer window and the four tallies // how many times this Lambda has run (shown on the backend view)

// One readable line per action. Open CloudWatch > Live Tail on this function's log group to watch them stream.
const log = (...parts) => console.log(parts.join(' '));

// Count every invocation, but write the count to DynamoDB at most every 2 s per Lambda copy.
let unflushed = 0, lastFlush = 0, lastScan = { calls: 0, rows: 0 };
async function flushCalls() {
  if (!unflushed || Date.now() - lastFlush < 2000) return;
  const n = unflushed; unflushed = 0; lastFlush = Date.now();
  try {
    await db.send(new UpdateItemCommand({
      TableName: TABLE, Key: { connectionId: { S: METRICS } },
      UpdateExpression: 'ADD #c :n', ExpressionAttributeNames: { '#c': 'calls' },
      ExpressionAttributeValues: { ':n': { N: String(n) } },
    }));
  } catch (e) { unflushed += n; }
}
const TUG_COUNTDOWN_MS = 3000; // 3-2-1 on every phone before pulling starts

const EFFECTS = new Set([
  'off', 'color', 'rainbow', 'strobe', 'wave', 'pulse',
  'sparkle', 'team', 'spotlight', 'countdown', 'text', 'charge', 'powered', 'tug', 'tugwin', 'lobby', 'backend', 'quiz',
]);
const ZONES = new Set(['left', 'center', 'right', 'remote']);

let api, apiEndpoint;
function mgmt(ctx) {
  const ep = `https://${ctx.domainName}/${ctx.stage}`;
  if (ep !== apiEndpoint) {
    api = new ApiGatewayManagementApiClient({ endpoint: ep });
    apiEndpoint = ep;
  }
  return api;
}

const ttl = () => String(Math.floor(Date.now() / 1000) + 6 * 3600);
const clean = (v, n = 24) => String(v ?? '').replace(/[\u0000-\u001f<>"]/g, '').trim().slice(0, n);
const isHex = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c);
const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

async function removeConnection(id) {
  try {
    await db.send(new DeleteItemCommand({ TableName: TABLE, Key: { connectionId: { S: id } } }));
  } catch (e) { console.warn('delete failed', id, e.name); }
}

async function post(ctx, id, data) {
  try {
    await mgmt(ctx).send(new PostToConnectionCommand({
      ConnectionId: id,
      Data: typeof data === 'string' ? data : JSON.stringify(data),
    }));
    return true;
  } catch (e) {
    if (e.name === 'GoneException' || e.$metadata?.httpStatusCode === 410) await removeConnection(id);
    return false;
  }
}

async function scanAll() {
  const items = [];
  let ExclusiveStartKey, rows = 0, calls = 0;
  do {
    const r = await db.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey }));
    for (const i of r.Items ?? []) {
      rows++;
      if (i.connectionId.S === METRICS) calls = Number(i.calls?.N || 0);
      if (i.connectionId.S.startsWith('#')) continue; // skip the meter items
      items.push({
        id: i.connectionId.S,
        role: i.role?.S ?? 'pending',
        dept: i.dept?.S ?? '',
        zone: i.zone?.S ?? '',
        city: i.city?.S ?? '',
      });
    }
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  lastScan = { calls, rows };
  return items;
}

function buildStats(items) {
  const s = { type: 'stats', phones: 0, screens: 0, admins: 0, depts: {}, zones: {}, cities: {},
    calls: lastScan.calls, rows: lastScan.rows, now: Date.now() };
  for (const it of items) {
    if (it.role === 'phone') {
      s.phones++;
      s.depts[it.dept] = (s.depts[it.dept] || 0) + 1;
      s.zones[it.zone] = (s.zones[it.zone] || 0) + 1;
      if (it.zone === 'remote' && it.city) s.cities[it.city] = (s.cities[it.city] || 0) + 1;
    } else if (it.role === 'screen') s.screens++;
    else if (it.role === 'admin') s.admins++;
  }
  return s;
}

function sanitizeEffect(e = {}) {
  if (!EFFECTS.has(e.name)) return null;
  const out = { name: e.name };
  if (isHex(e.color)) out.color = e.color;
  if (isHex(e.bg)) out.bg = e.bg;
  if (isHex(e.fg)) out.fg = e.fg;
  if (e.hz != null) out.hz = clamp(e.hz, 0.5, 3, 2.5);           // capped at 3 Hz for photosensitivity safety
  if (e.speed != null) out.speed = clamp(e.speed, 300, 10000, 2500);
  if (e.bpm != null) out.bpm = clamp(e.bpm, 40, 180, 72);
  if (e.perPerson != null) out.perPerson = Math.floor(clamp(e.perPerson, 3, 500, 40));
  if (['random', 'sides', 'depts'].includes(e.mode)) out.mode = e.mode;
  if (e.a) out.a = clean(e.a);
  if (e.b) out.b = clean(e.b);
  if (e.seconds != null) out.seconds = Math.floor(clamp(e.seconds, 10, 120, 45));
  if (e.from != null) out.from = Math.floor(clamp(e.from, 1, 10, 5));
  if (e.q != null) out.q = Math.floor(clamp(e.q, 0, 9, 0));
  if (['ask', 'reveal', 'done'].includes(e.phase)) out.phase = e.phase;
  if (e.dept) out.dept = clean(e.dept);
  if (e.text) out.text = clean(e.text, 60);
  if (e.sub) out.sub = clean(e.sub, 80);
  if (typeof e.url === 'string' && /^https?:\/\/[^\s"'<>]+$/.test(e.url)) out.url = e.url.slice(0, 300);
  return out;
}

// perPhone (optional) lets one broadcast give each connection its own version of the effect,
// e.g. which tug-of-war team that phone is on.
async function broadcast(ctx, effect, at = Date.now() + LEAD_MS, perPhone = null) {
  const payload = JSON.stringify({ type: 'effect', effect, at });
  const targets = (await scanAll()).filter((i) => i.role === 'phone' || i.role === 'screen' || i.role === 'admin');
  const t = Date.now();
  let ok = 0;
  const bodyFor = (it) => {
    const own = perPhone && perPhone(it);
    return own ? JSON.stringify({ type: 'effect', effect: { ...effect, ...own }, at }) : payload;
  };
  for (let i = 0; i < targets.length; i += BATCH) {
    const res = await Promise.all(targets.slice(i, i + BATCH).map((it) => post(ctx, it.id, bodyFor(it))));
    ok += res.filter(Boolean).length;
  }
  return { sent: ok, failed: targets.length - ok, ms: Date.now() - t };
}

function chargeView(item) {
  const n = (k) => Number(item?.[k]?.N || 0);
  const goal = Math.max(1, n('goal'));
  return {
    type: 'charge',
    taps: n('taps'),
    tappers: n('tappers'),
    goal,
    level: Math.min(1, n('taps') / goal),
    active: !!item?.active?.BOOL,
    done: !!item?.done?.BOOL,
  };
}

function quizView(item) {
  const n = (k) => Number(item?.[k]?.N || 0);
  return {
    type: 'quiz', round: n('round'), q: n('q'), phase: item?.phase?.S || 'none',
    counts: [n('c0'), n('c1'), n('c2'), n('c3')], total: n('total'), phones: n('phones'),
    endsAt: n('endsAt'), now: Date.now(),
  };
}

// Fair teams: with an odd number of phones one side has one phone less, so its pulls are scaled up
// (e.g. 41 vs 40 phones: each blue pull counts 41/40). Weights are read once every 2 s per container.
let tugW = { at: 0, wa: 1, wb: 1 };
async function tugWeights() {
  if (Date.now() - tugW.at < 2000) return tugW;
  const r = await db.send(new GetItemCommand({ TableName: TABLE, Key: { connectionId: { S: TUG } } }));
  const sa = Number(r.Item?.sizeA?.N || 0), sb = Number(r.Item?.sizeB?.N || 0), big = Math.max(sa, sb, 1);
  tugW = { at: Date.now(), wa: sa ? big / sa : 1, wb: sb ? big / sb : 1 };
  return tugW;
}

function tugView(item) {
  const n = (k) => Number(item?.[k]?.N || 0);
  const s = (k) => item?.[k]?.S || '';
  return {
    type: 'tug',
    a: n('a'), b: n('b'), pulls: n('pulls'), goal: Math.max(1, n('goal')),
    startsAt: n('startsAt'), endsAt: n('endsAt'),
    mode: s('mode'), teamA: s('teamA'), teamB: s('teamB'), phones: n('phones'),
    active: !!item?.active?.BOOL, done: !!item?.done?.BOOL, winner: s('winner'),
    now: Date.now(),
  };
}

// Ends the round exactly once (conditional write), then tells every device who won.
async function finishTug(ctx, view) {
  const winner = view.a === view.b ? 'draw' : view.a > view.b ? 'A' : 'B';
  try {
    await db.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: { connectionId: { S: TUG } },
      UpdateExpression: 'SET #done = :t, #active = :f, #winner = :w',
      ConditionExpression: '#done = :f',
      ExpressionAttributeNames: { '#done': 'done', '#active': 'active', '#winner': 'winner' },
      ExpressionAttributeValues: { ':t': { BOOL: true }, ':f': { BOOL: false }, ':w': { S: winner } },
    }));
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return; // someone else already finished it
    throw e;
  }
  log(`tug of war finished → ${winner === 'draw' ? 'draw' : (winner === 'A' ? 'RED' : 'BLUE') + ' wins'} (${view.a} vs ${view.b})`);
  await broadcast(ctx, {
    name: 'tugwin', winner, mode: view.mode, a: view.teamA, b: view.teamB,
    scoreA: view.a, scoreB: view.b, pulls: view.pulls || view.a + view.b, phones: view.phones,
    seconds: Math.max(1, Math.round((Math.min(Date.now(), view.endsAt) - view.startsAt) / 1000)),
  }, Date.now() + 600);
}

async function handleMessage(ctx, id, msg) {
  switch (msg.action) {
    case 'sync':
      // Clock sync: phones measure round-trip time and work out server time.
      await post(ctx, id, { type: 'sync', t0: Number(msg.t0) || 0, s: Date.now() });
      return;

    case 'join': {
      const role = ['phone', 'screen', 'admin'].includes(msg.role) ? msg.role : 'phone';
      if (role === 'admin' && msg.key !== ADMIN_KEY) {
        await post(ctx, id, { type: 'error', code: 'badkey', msg: 'Wrong admin key' });
        return;
      }
      const Item = { connectionId: { S: id }, role: { S: role }, ttl: { N: ttl() } };
      if (role === 'phone') {
        Item.dept = { S: clean(msg.dept) || 'OTHER' };
        Item.zone = { S: ZONES.has(msg.zone) ? msg.zone : 'center' };
        const city = clean(msg.city, 30);
        if (city) Item.city = { S: city };
      }
      await db.send(new PutItemCommand({ TableName: TABLE, Item }));
      log('join', role);
      await post(ctx, id, { type: 'joined', role, s: Date.now() });
      return;
    }

    case 'tap': {
      // Phones batch their taps (one message every ~0.8s), so 300 people tapping is only ~400 requests/sec.
      const n = Math.floor(clamp(msg.n, 1, 40, 1));
      let item;
      try {
        const r = await db.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: { connectionId: { S: META } },
          UpdateExpression: 'ADD #taps :n, #tappers :f',
          ConditionExpression: '#active = :t',
          ExpressionAttributeNames: { '#taps': 'taps', '#tappers': 'tappers', '#active': 'active' },
          ExpressionAttributeValues: { ':n': { N: String(n) }, ':f': { N: msg.first ? '1' : '0' }, ':t': { BOOL: true } },
          ReturnValues: 'ALL_NEW',
        }));
        item = r.Attributes;
      } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return; // power-up not running
        throw e;
      }
      const view = chargeView(item);
      log(`tap +${n} → ${view.taps}/${view.goal} (${Math.floor(view.level * 100)}%)`);
      await post(ctx, id, view);
      if (view.taps >= view.goal && !view.done) {
        // First Lambda to cross the goal flips "done" and fires FULL POWER on every device.
        try {
          await db.send(new UpdateItemCommand({
            TableName: TABLE,
            Key: { connectionId: { S: META } },
            UpdateExpression: 'SET #done = :t, #active = :f',
            ConditionExpression: '#done = :f',
            ExpressionAttributeNames: { '#done': 'done', '#active': 'active' },
            ExpressionAttributeValues: { ':t': { BOOL: true }, ':f': { BOOL: false } },
          }));
          log('FULL POWER reached');
          await broadcast(ctx, { name: 'powered' });
        } catch (e) {
          if (e.name !== 'ConditionalCheckFailedException') throw e;
        }
      }
      return;
    }

    case 'tug': {
      // A phone's batched pulls for team A or B. Only counted while the round is running.
      const team = msg.team === 'B' ? 'b' : 'a';
      const n = Math.floor(clamp(msg.n, 1, 40, 1));
      const w = await tugWeights();
      const x = n * (team === 'a' ? w.wa : w.wb);
      const add = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0);   // whole numbers, fair on average
      const now = Date.now();
      let item;
      try {
        const r = await db.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: { connectionId: { S: TUG } },
          UpdateExpression: 'ADD #team :add, #pulls :n',
          ConditionExpression: '#active = :t AND #startsAt <= :now AND #endsAt > :now',
          ExpressionAttributeNames: { '#team': team, '#pulls': 'pulls', '#active': 'active', '#startsAt': 'startsAt', '#endsAt': 'endsAt' },
          ExpressionAttributeValues: { ':add': { N: String(add) }, ':n': { N: String(n) }, ':t': { BOOL: true }, ':now': { N: String(now) } },
          ReturnValues: 'ALL_NEW',
        }));
        item = r.Attributes;
      } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return; // not running (yet / any more)
        throw e;
      }
      const view = tugView(item);
      log(`pull ${team === 'a' ? 'RED' : 'BLUE'} +${n} → red ${view.a} · blue ${view.b}`);
      await post(ctx, id, view);
      if (Math.abs(view.a - view.b) >= view.goal) await finishTug(ctx, view); // knock-out win
      return;
    }

    case 'answer': {
      // One vote per phone per question. Step 1 marks this phone's row (fails if it already voted
      // in this round), step 2 adds the vote to the tally, but only while the answer window is open.
      const choice = Math.floor(clamp(msg.choice, 0, 3, -1));
      const round = Math.floor(Number(msg.round) || 0);
      if (choice < 0 || !round) return;
      try {
        await db.send(new UpdateItemCommand({
          TableName: TABLE, Key: { connectionId: { S: id } },
          UpdateExpression: 'SET #qr = :r, #qc = :c',
          ConditionExpression: 'attribute_exists(connectionId) AND (attribute_not_exists(#qr) OR #qr <> :r)',
          ExpressionAttributeNames: { '#qr': 'quizRound', '#qc': 'quizChoice' },
          ExpressionAttributeValues: { ':r': { N: String(round) }, ':c': { N: String(choice) } },
        }));
      } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return; // already answered
        throw e;
      }
      let item;
      try {
        const r = await db.send(new UpdateItemCommand({
          TableName: TABLE, Key: { connectionId: { S: QUIZ } },
          UpdateExpression: 'ADD #c :one, #total :one',
          ConditionExpression: '#round = :r AND #phase = :ask AND #endsAt > :now',
          ExpressionAttributeNames: { '#c': `c${choice}`, '#total': 'total', '#round': 'round', '#phase': 'phase', '#endsAt': 'endsAt' },
          ExpressionAttributeValues: { ':one': { N: '1' }, ':r': { N: String(round) }, ':ask': { S: 'ask' }, ':now': { N: String(Date.now() - 1500) } },
          ReturnValues: 'ALL_NEW',
        }));
        item = r.Attributes;
      } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') { await post(ctx, id, { type: 'answered', ok: false }); return; }
        throw e;
      }
      const view = quizView(item);
      log(`answer Q${view.q + 1} → ${'ABCD'[choice]} (${view.total} answered)`);
      await post(ctx, id, { type: 'answered', ok: true, round, choice });
      return;
    }

    case 'quizstate': {
      const r = await db.send(new GetItemCommand({ TableName: TABLE, Key: { connectionId: { S: QUIZ } } }));
      await post(ctx, id, quizView(r.Item));
      return;
    }

    case 'tugstate': {
      const r = await db.send(new GetItemCommand({ TableName: TABLE, Key: { connectionId: { S: TUG } } }));
      const view = tugView(r.Item);
      await post(ctx, id, view);
      if (view.active && !view.done && Date.now() >= view.endsAt) await finishTug(ctx, view); // time's up
      return;
    }

    case 'charge': {
      const r = await db.send(new GetItemCommand({ TableName: TABLE, Key: { connectionId: { S: META } } }));
      await post(ctx, id, chargeView(r.Item));
      return;
    }

    case 'stats': {
      const items = await scanAll();
      await post(ctx, id, buildStats(items));
      return;
    }

    case 'cmd': {
      if (msg.key !== ADMIN_KEY) {
        await post(ctx, id, { type: 'error', code: 'badkey', msg: 'Wrong admin key' });
        return;
      }
      const effect = sanitizeEffect(msg.effect);
      if (!effect) {
        await post(ctx, id, { type: 'error', msg: 'Unknown effect' });
        return;
      }
      if (effect.name === 'charge') {
        // Start a power-up: goal scales with how many phones are in the room.
        const phones = (await scanAll()).filter((i) => i.role === 'phone').length;
        effect.goal = Math.max(5, phones) * (effect.perPerson || 40);
        await db.send(new PutItemCommand({
          TableName: TABLE,
          Item: {
            connectionId: { S: META }, role: { S: 'meta' }, ttl: { N: ttl() },
            taps: { N: '0' }, tappers: { N: '0' }, goal: { N: String(effect.goal) },
            active: { BOOL: true }, done: { BOOL: false },
          },
        }));
      }
      const at = Date.now() + LEAD_MS;
      let perPhone = null;
      if (effect.name === 'tug') {
        // Start a tug-of-war round: two teams, a countdown, a time limit, and a knock-out margin.
        // Equal teams: shuffle every connected phone (Fisher-Yates) and deal them out
        // alternately, like cards: RED, BLUE, RED, BLUE... so the sides differ by at most one.
        const deck = (await scanAll()).filter((i) => i.role === 'phone').map((i) => i.id);
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        const teamOf = new Map(deck.map((cid, i) => [cid, i % 2 === 0 ? 'A' : 'B']));
        perPhone = (it) => (teamOf.has(it.id) ? { team: teamOf.get(it.id) } : null);
        const phones = deck.length;
        effect.sizeA = Math.ceil(phones / 2);
        effect.sizeB = Math.floor(phones / 2);
        effect.mode = 'random';
        effect.a = 'RED';
        effect.b = 'BLUE';
        effect.seconds = effect.seconds || 45;
        effect.goal = Math.max(5, phones) * 35;   // pull gap for a knock-out win; also how far the rope moves
        effect.startsAt = at + TUG_COUNTDOWN_MS;
        effect.endsAt = effect.startsAt + effect.seconds * 1000;
        await db.send(new PutItemCommand({
          TableName: TABLE,
          Item: {
            connectionId: { S: TUG }, role: { S: 'meta' }, ttl: { N: ttl() },
            a: { N: '0' }, b: { N: '0' }, pulls: { N: '0' }, goal: { N: String(effect.goal) },
            sizeA: { N: String(effect.sizeA) }, sizeB: { N: String(effect.sizeB) },
            startsAt: { N: String(effect.startsAt) }, endsAt: { N: String(effect.endsAt) },
            mode: { S: effect.mode }, teamA: { S: effect.a }, teamB: { S: effect.b }, phones: { N: String(phones) },
            active: { BOOL: true }, done: { BOOL: false }, winner: { S: '' },
          },
        }));
      }
      if (effect.name === 'quiz') {
        effect.phase = effect.phase || 'ask';
        if (effect.phase === 'ask') {
          // New question: fresh tallies, and an answer window that closes on its own.
          const phones = (await scanAll()).filter((i) => i.role === 'phone').length;
          effect.seconds = effect.seconds || 20;
          effect.round = at;
          effect.endsAt = at + effect.seconds * 1000;
          effect.phones = phones;
          await db.send(new PutItemCommand({
            TableName: TABLE,
            Item: {
              connectionId: { S: QUIZ }, role: { S: 'meta' }, ttl: { N: ttl() },
              round: { N: String(at) }, q: { N: String(effect.q || 0) }, phase: { S: 'ask' },
              endsAt: { N: String(effect.endsAt) }, phones: { N: String(phones) },
              c0: { N: '0' }, c1: { N: '0' }, c2: { N: '0' }, c3: { N: '0' }, total: { N: '0' },
            },
          }));
        } else if (effect.phase === 'reveal') {
          // Close the window and send the final tallies along with the reveal.
          const r = await db.send(new UpdateItemCommand({
            TableName: TABLE, Key: { connectionId: { S: QUIZ } },
            UpdateExpression: 'SET #phase = :p', ExpressionAttributeNames: { '#phase': 'phase' },
            ExpressionAttributeValues: { ':p': { S: 'reveal' } }, ReturnValues: 'ALL_NEW',
          }));
          const v = quizView(r.Attributes);
          Object.assign(effect, { q: v.q, round: v.round, counts: v.counts, total: v.total, phones: v.phones });
        }
      }
      const r = await broadcast(ctx, effect, at, perPhone);
      log(`broadcast "${effect.name}" → ${r.sent} devices in ${r.ms} ms`);
      await post(ctx, id, { type: 'ack', effect: effect.name, ...r });
      return;
    }

    default:
      await post(ctx, id, { type: 'error', msg: 'Unknown action' });
  }
}

export const handler = async (event) => {
  const ctx = event.requestContext;
  const id = ctx.connectionId;
  unflushed++;
  try {
    if (ctx.routeKey === '$connect') {
      await db.send(new PutItemCommand({
        TableName: TABLE,
        Item: { connectionId: { S: id }, role: { S: 'pending' }, ttl: { N: ttl() } },
      }));
      return { statusCode: 200 };
    }
    if (ctx.routeKey === '$disconnect') {
      await removeConnection(id);
      log('disconnect');
      return { statusCode: 200 };
    }
    let msg;
    try { msg = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400 }; }
    await handleMessage(ctx, id, msg);
    return { statusCode: 200 };
  } catch (err) {
    console.error(err);
    return { statusCode: 500 };
  } finally {
    await flushCalls();
  }
};
