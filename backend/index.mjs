// 300 Phones, One Button — the Lambda "chef".
// One function handles every WebSocket route: $connect, $disconnect and $default.
// Messages from browsers look like { action: "join" | "sync" | "stats" | "cmd" | "tap" | "charge" | "tug" | "tugstate", ... }.

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
const TUG_COUNTDOWN_MS = 3000; // 3-2-1 on every phone before pulling starts

const EFFECTS = new Set([
  'off', 'color', 'rainbow', 'strobe', 'wave', 'pulse',
  'sparkle', 'team', 'spotlight', 'countdown', 'text', 'charge', 'powered', 'tug', 'tugwin',
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
  let ExclusiveStartKey;
  do {
    const r = await db.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey }));
    for (const i of r.Items ?? []) {
      if (i.connectionId.S.startsWith('#')) continue; // skip the meter item
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
  return items;
}

function buildStats(items) {
  const s = { type: 'stats', phones: 0, screens: 0, admins: 0, depts: {}, zones: {}, cities: {} };
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
  if (e.dept) out.dept = clean(e.dept);
  if (e.text) out.text = clean(e.text, 60);
  if (e.sub) out.sub = clean(e.sub, 80);
  if (typeof e.url === 'string' && /^https?:\/\/[^\s"'<>]+$/.test(e.url)) out.url = e.url.slice(0, 300);
  return out;
}

async function broadcast(ctx, effect, at = Date.now() + LEAD_MS) {
  const payload = JSON.stringify({ type: 'effect', effect, at });
  const targets = (await scanAll()).filter((i) => i.role === 'phone' || i.role === 'screen' || i.role === 'admin');
  const t = Date.now();
  let ok = 0;
  for (let i = 0; i < targets.length; i += BATCH) {
    const res = await Promise.all(targets.slice(i, i + BATCH).map((it) => post(ctx, it.id, payload)));
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

function tugView(item) {
  const n = (k) => Number(item?.[k]?.N || 0);
  const s = (k) => item?.[k]?.S || '';
  return {
    type: 'tug',
    a: n('a'), b: n('b'), goal: Math.max(1, n('goal')),
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
  await broadcast(ctx, {
    name: 'tugwin', winner, mode: view.mode, a: view.teamA, b: view.teamB,
    scoreA: view.a, scoreB: view.b, phones: view.phones,
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
      const now = Date.now();
      let item;
      try {
        const r = await db.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: { connectionId: { S: TUG } },
          UpdateExpression: 'ADD #team :n',
          ConditionExpression: '#active = :t AND #startsAt <= :now AND #endsAt > :now',
          ExpressionAttributeNames: { '#team': team, '#active': 'active', '#startsAt': 'startsAt', '#endsAt': 'endsAt' },
          ExpressionAttributeValues: { ':n': { N: String(n) }, ':t': { BOOL: true }, ':now': { N: String(now) } },
          ReturnValues: 'ALL_NEW',
        }));
        item = r.Attributes;
      } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return; // not running (yet / any more)
        throw e;
      }
      const view = tugView(item);
      await post(ctx, id, view);
      if (Math.abs(view.a - view.b) >= view.goal) await finishTug(ctx, view); // knock-out win
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
      if (effect.name === 'tug') {
        // Start a tug-of-war round: two teams, a countdown, a time limit, and a knock-out margin.
        const phones = (await scanAll()).filter((i) => i.role === 'phone').length;
        // Teams are random: every phone flips its own coin for each round (see web/effects.js).
        effect.mode = 'random';
        effect.a = 'RED';
        effect.b = 'BLUE';
        effect.seconds = effect.seconds || 45;
        effect.goal = Math.max(5, phones) * 8;
        effect.startsAt = at + TUG_COUNTDOWN_MS;
        effect.endsAt = effect.startsAt + effect.seconds * 1000;
        await db.send(new PutItemCommand({
          TableName: TABLE,
          Item: {
            connectionId: { S: TUG }, role: { S: 'meta' }, ttl: { N: ttl() },
            a: { N: '0' }, b: { N: '0' }, goal: { N: String(effect.goal) },
            startsAt: { N: String(effect.startsAt) }, endsAt: { N: String(effect.endsAt) },
            mode: { S: effect.mode }, teamA: { S: effect.a }, teamB: { S: effect.b }, phones: { N: String(phones) },
            active: { BOOL: true }, done: { BOOL: false }, winner: { S: '' },
          },
        }));
      }
      const r = await broadcast(ctx, effect, at);
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
      return { statusCode: 200 };
    }
    let msg;
    try { msg = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400 }; }
    await handleMessage(ctx, id, msg);
    return { statusCode: 200 };
  } catch (err) {
    console.error(err);
    return { statusCode: 500 };
  }
};
