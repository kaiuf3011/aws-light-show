// Shared effects engine. Every effect is a pure function of (time since start, who I am),
// so all phones that agree on server time draw exactly the same frame at the same moment.
(function () {
  const ZONE_INDEX = { left: 0, center: 1, right: 2, remote: 3 };

  function rgb(hex) {
    let h = String(hex || '#ffffff').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function dim(hex, k) {
    const [r, g, b] = rgb(hex);
    k = Math.max(0, Math.min(1, k));
    return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  }
  function hash(a, b) {
    let h = 2166136261 ^ a;
    h = Math.imul(h ^ b, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }
  const bump = (p, c, w) => Math.exp(-(((p - c) / w) ** 2));

  function deptColor(id) {
    const d = (window.SHOW?.departments || []).find((x) => x.id === id);
    return d ? d.color : '#2979ff';
  }

  // Tug of war: who are the two teams, and which one am I on?
  function tugTeams(effect) {
    if (effect.mode === 'depts') {
      const ca = deptColor(effect.a);
      let cb = deptColor(effect.b);
      if (cb === ca) cb = '#ffffff';
      return { A: { name: effect.a, color: ca }, B: { name: effect.b, color: cb } };
    }
    if (effect.mode === 'random') return { A: { name: 'RED', color: '#ff1744' }, B: { name: 'BLUE', color: '#2979ff' } };
    return { A: { name: 'LEFT', color: '#ff1744' }, B: { name: 'RIGHT', color: '#2979ff' } };
  }
  function tugMyTeam(effect, me) {
    // the server deals equal teams and tells each phone its side
    if (effect.team === 'A' || effect.team === 'B') return effect.team;
    // random teams: a fresh coin flip per phone per round, same answer every frame
    if (effect.mode === 'random') return hash(me.seed | 0, Math.floor((effect.startsAt || 0) / 1000) | 0) < 0.5 ? 'A' : 'B';
    if (effect.mode === 'depts') {
      if (me.dept === effect.a) return 'A';
      if (me.dept === effect.b) return 'B';
      return me.tugPick || null; // everyone else picks a side to help
    }
    if (me.zone === 'left') return 'A';
    if (me.zone === 'right') return 'B';
    return (me.seed | 0) % 2 === 0 ? 'A' : 'B'; // middle and remote: split evenly at random
  }

  // me = { zone, dept, seed }
  function render(effect, t, me) {
    const out = { bg: '#000', big: '', mid: '', small: '', fg: '#fff', link: null, idle: false };
    if (!effect || effect.name === 'off') { out.idle = true; return out; }
    const z = ZONE_INDEX[me.zone] ?? 1;
    const c = effect.color || '#ff1744';

    switch (effect.name) {
      case 'color':
        out.bg = c;
        break;

      case 'rainbow': {
        // each zone is shifted in hue, so colour rolls across the hall
        const hue = ((t / (effect.speed || 2500)) * 360 + z * 60) % 360;
        out.bg = `hsl(${hue},100%,50%)`;
        break;
      }

      case 'strobe': {
        const hz = Math.min(effect.hz || 2.5, 3);
        out.bg = Math.floor(t / (500 / hz)) % 2 === 0 ? c : '#000';
        break;
      }

      case 'wave': {
        // left lights first, then middle, then right, then remote viewers
        const period = 2400, step = 420, d = z * step;
        if (t < d) break;
        const p = (t - d) % period;
        out.bg = dim(c, p < 550 ? 1 - p / 550 : 0);
        break;
      }

      case 'pulse': {
        const beat = 60000 / (effect.bpm || 72);
        const p = (t % beat) / beat;
        out.bg = dim(c, Math.min(1, bump(p, 0.08, 0.06) + 0.75 * bump(p, 0.3, 0.06)));
        break;
      }

      case 'sparkle': {
        // each phone twinkles at its own random moments = stars across the hall
        const r = hash(me.seed | 0, Math.floor(t / 220));
        out.bg = r < 0.07 ? '#ffffff' : r < 0.11 ? dim(c, 0.55) : '#000';
        break;
      }

      case 'team': {
        const col = deptColor(me.dept);
        out.bg = dim(col, 0.6 + 0.4 * Math.sin(t / 500));
        out.big = me.dept || '';
        out.fg = '#000';
        break;
      }

      case 'spotlight': {
        if (me.dept && me.dept === effect.dept) {
          out.bg = dim(deptColor(me.dept), 0.65 + 0.35 * Math.sin(t / 160));
          out.big = me.dept;
          out.small = 'make some noise';
          out.fg = '#000';
        }
        break;
      }

      case 'countdown': {
        const from = effect.from || 5;
        const s = from - Math.floor(t / 1000);
        if (s > 0) {
          out.big = String(s);
          out.fg = dim('#ffffff', 1 - ((t % 1000) / 1000) * 0.75);
        } else {
          const tt = t - from * 1000;
          out.bg = tt < 600 ? '#ffffff' : dim(c, Math.max(0.35, 1 - (tt - 600) / 4000));
        }
        break;
      }

      case 'lobby': {
        // joining window before Power-Up: everyone sees the same countdown
        const s = Math.max(0, Math.ceil(((effect.seconds || 60) * 1000 - t) / 1000));
        out.bg = '#141415';
        out.big = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        out.mid = 'until power-up';
        out.small = 'keep this page open · brightness up';
        out.fg = '#ededed';
        break;
      }

      case 'charge':
        // phone page draws the TAP button on top of this
        out.bg = '#000';
        break;

      case 'powered':
        if (t < 450) out.bg = '#ffffff';
        else {
          out.bg = dim('#ff9900', Math.max(0.9, 1 - (t - 450) / 3000) * (0.92 + 0.08 * Math.sin(t / 120)));
          out.big = 'ON';
          out.small = 'full power';
          out.fg = '#000';
        }
        break;

      case 'tug': {
        // the phone page draws the PULL button; background = a dark wash of my team colour
        const team = tugMyTeam(effect, me);
        out.bg = team ? dim(tugTeams(effect)[team].color, 0.22) : '#000';
        break;
      }

      case 'tugwin': {
        const teams = tugTeams(effect);
        const mine = me.tugTeam;
        const total = (effect.scoreA || 0) + (effect.scoreB || 0);
        const fill = (txt) => String(txt || '')
          .replace('{total}', total.toLocaleString('en-IN')).replace('{phones}', effect.phones || 'all these')
          .replace('{seconds}', effect.seconds || '').replace('{mine}', me.tugPulls || 0);
        if (t >= 4500 && mine && t < 9000) {
          // stage 2: your own number
          out.bg = '#141415';
          out.big = String(me.tugPulls || 0);
          out.mid = 'pulls from you';
          out.small = 'AWS counted every single one';
          out.fg = '#ffcc66';
          break;
        }
        if (t >= (mine ? 9000 : 4500)) {
          // stage 3: the curiosity hook
          const T = (window.SHOW && window.SHOW.tugTeaser) || {};
          out.bg = '#141415';
          out.big = '?';
          out.mid = fill(T.question);
          out.small = fill(T.spoiler) + '\n' + fill(T.cta);
          out.fg = '#ffffff';
          break;
        }
        if (effect.winner === 'draw') {
          out.bg = dim('#ffffff', 0.5 + 0.3 * Math.sin(t / 200));
          out.big = 'DRAW';
          out.fg = '#000';
        } else if (mine === effect.winner) {
          out.bg = t < 400 ? '#ffffff' : dim(teams[mine].color, 0.7 + 0.3 * Math.sin(t / 140));
          out.big = 'WIN';
          out.small = 'your team won';
          out.fg = '#000';
        } else if (mine) {
          out.bg = '#141414';
          out.big = 'GG';
          out.small = teams[effect.winner].name + ' wins';
          out.fg = '#888';
        } else {
          out.bg = dim(teams[effect.winner].color, 0.6 + 0.3 * Math.sin(t / 160));
          out.big = teams[effect.winner].name;
          out.small = 'wins';
          out.fg = '#000';
        }
        break;
      }

      case 'text':
        out.bg = effect.bg || '#000';
        out.fg = effect.fg || '#fff';
        out.big = effect.text || '';
        out.small = effect.sub || '';
        out.link = effect.url || null;
        break;
    }
    return out;
  }

  window.Effects = { render, deptColor, dim, tugTeams, tugMyTeam };
})();
