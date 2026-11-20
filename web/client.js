// WebSocket client with auto-reconnect and clock sync (NTP-style).
// serverNow() lets every device agree on "what time is it on AWS" to within a few ms.
(function () {
  window.ShowClient = function (opts) {
    let ws = null, retry = 0, stopped = false, keepAlive = null;
    let samples = [];
    let offset = 0;

    function send(obj) {
      if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; }
      return false;
    }
    function ping() { send({ action: 'sync', t0: Date.now() }); }
    function burst(n) { for (let i = 0; i < n; i++) setTimeout(ping, i * 300 + Math.random() * 150); }

    function onSync(m) {
      const t1 = Date.now();
      const rtt = t1 - m.t0;
      if (rtt < 0 || rtt > 10000) return;
      samples.push({ rtt, off: m.s - (m.t0 + t1) / 2 });
      if (samples.length > 10) samples.shift();
      // the fastest round-trip gives the most accurate estimate
      offset = samples.reduce((a, b) => (b.rtt < a.rtt ? b : a)).off;
    }

    function connect() {
      if (stopped) return;
      opts.onStatus && opts.onStatus('connecting');
      try { ws = new WebSocket(window.WS_URL); } catch (e) { scheduleReconnect(); return; }
      ws.onopen = () => {
        retry = 0;
        send(Object.assign({ action: 'join', role: opts.role }, opts.getJoin ? opts.getJoin() : {}));
        burst(4);
        clearInterval(keepAlive);
        // keeps the connection alive (API Gateway closes idle sockets after 10 min) and refreshes the clock
        keepAlive = setInterval(ping, 40000 + Math.random() * 10000);
        opts.onStatus && opts.onStatus('open');
      };
      ws.onmessage = (e) => {
        let m;
        try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === 'sync') onSync(m);
        else opts.onMessage && opts.onMessage(m);
      };
      ws.onclose = () => {
        clearInterval(keepAlive);
        opts.onStatus && opts.onStatus('closed');
        scheduleReconnect();
      };
      ws.onerror = () => { try { ws.close(); } catch {} };
    }
    function scheduleReconnect() {
      if (stopped) return;
      const wait = Math.min(8000, 500 * 2 ** retry++) + Math.random() * 700;
      setTimeout(connect, wait);
    }

    connect();
    return {
      send,
      serverNow: () => Date.now() + offset,
      offset: () => offset,
      bestRtt: () => (samples.length ? Math.min(...samples.map((s) => s.rtt)) : null),
      close: () => { stopped = true; try { ws.close(); } catch {} },
    };
  };

  // Plays effects at the exact server time they were scheduled for.
  window.EffectPlayer = function (client) {
    let current = null, pending = [];
    return {
      push(m) { pending.push(m); pending.sort((a, b) => a.at - b.at); },
      frame() {
        const now = client.serverNow();
        while (pending.length && pending[0].at <= now) { current = pending.shift(); current.effect.__at = current.at; }
        return current ? { effect: current.effect, t: now - current.at } : { effect: null, t: 0 };
      },
    };
  };
})();
