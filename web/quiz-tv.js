// The live quiz on the big screen (used by screen.html and explain.html).
// Questions live in show-config.js; AWS only keeps the tallies.
// Usage: const quiz = QuizTV(client); quiz.onMessage(m) for every message; quiz.frame(effect) every frame.
(function () {
  const css = `
  #quizTV { position: fixed; inset: 0; z-index: 50; display: none; flex-direction: column; justify-content: center;
    padding: 6vh 7vw; background: #0f0f10; color: var(--text); font-family: var(--mono); }
  #quizTV.on { display: flex; }
  #quizTV .qt-top { display: flex; justify-content: space-between; color: var(--muted); font-size: clamp(13px, 1.2vw, 22px); }
  #quizTV .qt-top b { color: var(--accent); font-weight: 400; }
  #quizTV .qt-q { font-size: clamp(26px, 3.1vw, 58px); font-weight: 500; line-height: 1.2; margin: 3.5vh 0 4.5vh; max-width: 70vw; }
  #quizTV .qt-rows { display: flex; flex-direction: column; gap: 2.2vh; }
  #quizTV .qt-row { display: grid; grid-template-columns: 3.4em minmax(0, 1fr) auto 5.5em; align-items: center; gap: 1.4vw;
    font-size: clamp(18px, 1.85vw, 34px); transition: color .4s, opacity .4s; white-space: pre; }
  #quizTV .qt-row .k { border: 1px solid var(--line-strong); text-align: center; padding: .15em 0; }
  #quizTV .qt-row .bar { color: var(--text-2); }
  #quizTV .qt-row .n { text-align: right; color: var(--text-2); }
  #quizTV .qt-row > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; }
  #quizTV .qt-row.dim { opacity: .38; }
  #quizTV .qt-row.right { color: var(--good, #3dd68c); }
  #quizTV .qt-row.right .k { border-color: var(--good, #3dd68c); background: var(--good, #3dd68c); color: #0f0f10; }
  #quizTV .qt-row.right .bar, #quizTV .qt-row.right .n { color: var(--good, #3dd68c); }
  #quizTV .qt-foot { margin-top: 5vh; display: flex; justify-content: space-between; align-items: flex-end; gap: 4vw;
    font-size: clamp(15px, 1.4vw, 26px); color: var(--text-2); white-space: pre; }
  #quizTV .qt-foot b { color: var(--accent); font-weight: 400; }
  #quizTV .qt-why { color: var(--accent); white-space: normal; max-width: 60vw; }
  #quizTV .qt-done { font-size: clamp(30px, 4vw, 72px); font-weight: 500; line-height: 1.15; }
  #quizTV .qt-done span { display: block; color: var(--text-2); font-size: .45em; font-weight: 400; margin-top: 2vh; }
  #quizTV .qt-qr { display: flex; gap: 2.5vw; align-items: flex-end; margin-top: 6vh; }
  #quizTV .qt-qr > div:first-child { background: #ededed; padding: 12px; width: clamp(140px, 13vw, 240px); line-height: 0; }
  #quizTV .qt-qr svg { width: 100%; height: auto; }
  #quizTV .qt-qr .cap { color: var(--accent); font-size: clamp(14px, 1.3vw, 24px); }
  #quizTV .qt-qr .url { color: var(--muted); font-size: clamp(12px, 1vw, 18px); }
  `;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const bar = (v, w) => (window.ASCII && ASCII.bar ? ASCII.bar(v, w) : '#'.repeat(Math.round(v * w)).padEnd(w, '.'));
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  window.QuizTV = function (client) {
    const S = window.SHOW || {};
    const Q = S.quiz || [];
    const join = S.joinUrl && !/REPLACE-ME/.test(S.joinUrl) ? S.joinUrl : '';
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'quizTV'; document.body.appendChild(el);

    let state = null, fx = null, shown = [0, 0, 0, 0], lastHtml = '', poll = null;
    const results = {};   // question index -> % of the room that got it right
    function startPoll(on) {
      if (on && !poll) { client.send({ action: 'quizstate' }); poll = setInterval(() => client.send({ action: 'quizstate' }), 600); }
      if (!on && poll) { clearInterval(poll); poll = null; }
    }

    function render(now) {
      const phase = fx.phase || 'ask';
      if (phase === 'done') {
        let qr = '';
        if (join && typeof window.qrcode === 'function') {
          try { const q = qrcode(0, 'M'); q.addData(join); q.make();
            qr = `<div class="qt-qr"><div>${q.createSvgTag({ cellSize: 8, margin: 0, scalable: true })}</div>
              <div><div class="cap">scan to join the club</div><div class="url">${esc(join.replace(/^https?:\/\//, ''))}</div></div></div>`; } catch (e) {}
        }
        const recap = Q.map((it, i) => {
          const pct = results[i];
          return `<div class="qt-row ${pct == null ? 'dim' : ''}"><span class="k">Q${i + 1}</span><span>${esc(it.options[it.answer] || '')}</span>` +
            `<span class="bar">${pct == null ? '' : `[${bar(pct / 100, 24)}]`}</span><span class="n">${pct == null ? '' : pct + '%'}</span></div>`;
        }).join('');
        return `<div class="qt-top"><span>quiz · done</span><span>how the room did</span></div>
          <div class="qt-done" style="margin:4vh 0 5vh">That's the quiz.<span>Your own score is on your phone.</span></div>
          <div class="qt-rows">${recap}</div>${qr}`;
      }
      const qi = fx.q || 0, item = Q[qi] || { q: 'Question ' + (qi + 1), options: ['A', 'B', 'C', 'D'], answer: -1 };
      const live = state && state.round === fx.round ? state : null;
      const counts = phase === 'reveal' ? (fx.counts || (live && live.counts) || [0, 0, 0, 0]) : (live ? live.counts : [0, 0, 0, 0]);
      const total = counts.reduce((a, b) => a + b, 0);
      const phones = Math.max(1, fx.phones || (live && live.phones) || 1);
      const left = (fx.endsAt || 0) - now;
      const rows = item.options.map((o, i) => {
        let cls = '', b = '', n = '';
        if (phase === 'reveal') {
          const f = total ? counts[i] / total : 0;
          shown[i] += (f - shown[i]) * 0.12;
          cls = i === item.answer ? 'right' : 'dim';
          b = `[${bar(shown[i], 24)}]`; n = `${String(Math.round(shown[i] * 100)).padStart(3, ' ')}%`;
        }
        return `<div class="qt-row ${cls}"><span class="k">${'ABCD'[i]}</span><span>${esc(o)}</span><span class="bar">${b}</span><span class="n">${n}</span></div>`;
      }).join('');
      let foot;
      if (phase === 'reveal') {
        const right = item.answer >= 0 && total ? Math.round(counts[item.answer] / total * 100) : 0;
        results[qi] = right;
        foot = `<span class="qt-why">${esc(item.why || '')}</span><span><b>${right}%</b> got it right · ${fmt(total)} answers</span>`;
      } else {
        const got = live ? live.total : 0;
        foot = `<span>answered  <b>${fmt(got)}</b> / ${fmt(phones)}  [${bar(Math.min(1, got / phones), 20)}]</span>` +
          `<span>${left > 0 ? 'answer on your phone' : "time's up · reveal coming"}</span>`;
      }
      const clock = phase === 'ask' ? `<b>${mmss(left)}</b>` : 'answer';
      return `<div class="qt-top"><span>quiz · question ${qi + 1} / ${Q.length || 1}</span><span>${clock}</span></div>
        <div class="qt-q">${esc(item.q)}</div><div class="qt-rows">${rows}</div><div class="qt-foot">${foot}</div>`;
    }

    return {
      onMessage(m) { if (m && m.type === 'quiz') state = m; },
      // effect is what EffectPlayer.frame() returned; returns true while the quiz is on screen
      frame(effect) {
        const on = !!effect && effect.name === 'quiz';
        el.classList.toggle('on', on);
        if (!on) { fx = null; startPoll(false); return false; }
        if (!fx || fx.__at !== effect.__at) { if (effect.phase !== 'reveal') shown = [0, 0, 0, 0]; }
        fx = effect;
        startPoll(fx.phase === 'ask' || !fx.phase);
        const html = render(client.serverNow());
        if (html !== lastHtml) { el.innerHTML = html; lastHtml = html; }
        return true;
      },
    };
  };
})();
