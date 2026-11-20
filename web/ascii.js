// ASCII art helpers: a block-letter font (figlet "ANSI Shadow", embedded) and a boot-up reveal.
(function () {
  const FONT = {"A": [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"], "B": ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██████╔╝", "╚═════╝ "], "C": [" ██████╗", "██╔════╝", "██║     ", "██║     ", "╚██████╗", " ╚═════╝"], "D": ["██████╗ ", "██╔══██╗", "██║  ██║", "██║  ██║", "██████╔╝", "╚═════╝ "], "E": ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"], "F": ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "██║     ", "╚═╝     "], "G": [" ██████╗ ", "██╔════╝ ", "██║  ███╗", "██║   ██║", "╚██████╔╝", " ╚═════╝ "], "H": ["██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"], "I": ["██╗", "██║", "██║", "██║", "██║", "╚═╝"], "J": ["     ██╗", "     ██║", "     ██║", "██   ██║", "╚█████╔╝", " ╚════╝ "], "K": ["██╗  ██╗", "██║ ██╔╝", "█████╔╝ ", "██╔═██╗ ", "██║  ██╗", "╚═╝  ╚═╝"], "L": ["██╗     ", "██║     ", "██║     ", "██║     ", "███████╗", "╚══════╝"], "M": ["███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝"], "N": ["███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝"], "O": [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "], "P": ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     "], "Q": [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║▄▄ ██║", "╚██████╔╝", " ╚══▀▀═╝ "], "R": ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝"], "S": ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"], "T": ["████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   "], "U": ["██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "], "V": ["██╗   ██╗", "██║   ██║", "██║   ██║", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚═══╝  "], "W": ["██╗    ██╗", "██║    ██║", "██║ █╗ ██║", "██║███╗██║", "╚███╔███╔╝", " ╚══╝╚══╝ "], "X": ["██╗  ██╗", "╚██╗██╔╝", " ╚███╔╝ ", " ██╔██╗ ", "██╔╝ ██╗", "╚═╝  ╚═╝"], "Y": ["██╗   ██╗", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚██╔╝  ", "   ██║   ", "   ╚═╝   "], "Z": ["███████╗", "╚══███╔╝", "  ███╔╝ ", " ███╔╝  ", "███████╗", "╚══════╝"], "0": [" ██████╗ ", "██╔═████╗", "██║██╔██║", "████╔╝██║", "╚██████╔╝", " ╚═════╝ "], "1": [" ██╗", "███║", "╚██║", " ██║", " ██║", " ╚═╝"], "2": ["██████╗ ", "╚════██╗", " █████╔╝", "██╔═══╝ ", "███████╗", "╚══════╝"], "3": ["██████╗ ", "╚════██╗", " █████╔╝", " ╚═══██╗", "██████╔╝", "╚═════╝ "], "4": ["██╗  ██╗", "██║  ██║", "███████║", "╚════██║", "     ██║", "     ╚═╝"], "5": ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"], "6": [" ██████╗ ", "██╔════╝ ", "███████╗ ", "██╔═══██╗", "╚██████╔╝", " ╚═════╝ "], "7": ["███████╗", "╚════██║", "    ██╔╝", "   ██╔╝ ", "   ██║  ", "   ╚═╝  "], "8": [" █████╗ ", "██╔══██╗", "╚█████╔╝", "██╔══██╗", "╚█████╔╝", " ╚════╝ "], "9": [" █████╗ ", "██╔══██╗", "╚██████║", " ╚═══██║", " █████╔╝", " ╚════╝ "], " ": ["    ", "    ", "    ", "    ", "    ", "    "], "-": ["      ", "      ", "█████╗", "╚════╝", "      ", "      "], ":": ["   ", "██╗", "╚═╝", "██╗", "╚═╝", "   "], "%": ["██╗ ██╗", "╚═╝██╔╝", "  ██╔╝ ", " ██╔╝  ", "██╔╝██╗", "╚═╝ ╚═╝"], ".": ["   ", "   ", "   ", "   ", "██╗", "╚═╝"], "&": ["   ██╗   ", "   ██║   ", "████████╗", "██╔═██╔═╝", "██████║  ", "╚═════╝  "], "?": ["██████╗ ", "╚════██╗", "  ▄███╔╝", "  ▀▀══╝ ", "  ██╗   ", "  ╚═╝   "], "/": ["    ██╗", "   ██╔╝", "  ██╔╝ ", " ██╔╝  ", "██╔╝   ", "╚═╝    "]};
  const H = 6;

  // Big block letters. Returns an array of 6 strings.
  function banner(text) {
    const out = Array(H).fill('');
    for (const ch of String(text).toUpperCase()) {
      const g = FONT[ch] || FONT[' '];
      for (let i = 0; i < H; i++) out[i] += g[i];
    }
    // pad every row to the same width, so centred layouts can't shift rows against each other
    const rows = out.map((r) => r.replace(/\s+$/, ''));
    const w = Math.max(...rows.map((r) => r.length));
    return rows.map((r) => r.padEnd(w, ' '));
  }

  // [████████░░░░] style bar
  function bar(frac, width) {
    const n = Math.max(0, Math.min(width, Math.round(frac * width)));
    return '█'.repeat(n) + '░'.repeat(width - n);
  }

  // Server-log timestamp, like 10:41:05.2
  function stamp(ms) {
    const d = new Date(ms);
    const p = (v) => String(v).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${Math.floor(d.getMilliseconds() / 100)}`;
  }

  // Turns an image into rows of characters by brightness (done once, on load).
  function fromImage(img, cols, rows, ramp = ' .:-=+*#%@') {
    const c = document.createElement('canvas');
    c.width = cols; c.height = rows;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, cols, rows);
    const px = x.getImageData(0, 0, cols, rows).data;
    const out = [];
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let i = 0; i < cols; i++) {
        const k = (y * cols + i) * 4;
        const light = (0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]) / 255;
        line += ramp[Math.min(ramp.length - 1, Math.floor(light * ramp.length))];
      }
      out.push(line);
    }
    return out;
  }

  // Boot-up reveal: every visible character has its own threshold. As level goes 0 -> 1,
  // characters switch on one by one; ones about to switch on flicker as noise.
  function Reveal(rows) {
    const NOISE = '.:-=+*';
    const cells = rows.map((r) => [...r].map((ch) => ({ ch, th: ch === ' ' ? -1 : Math.random() * 0.98 })));
    return {
      render(level, t) {
        const slot = Math.floor(t / 90);
        let s = '';
        for (const row of cells) {
          for (const c of row) {
            if (c.th < 0) s += ' ';
            else if (level >= c.th) s += c.ch;
            else if (c.th - level < 0.07) {
              const r = Math.sin((c.th * 9973 + slot) * 12.9898) * 43758.5453;
              const f = r - Math.floor(r);
              s += f < 0.5 ? NOISE[Math.floor(f * 2 * NOISE.length)] : ' ';
            } else s += ' ';
          }
          s += '\n';
        }
        return s;
      },
    };
  }

  window.ASCII = { banner, bar, stamp, fromImage, Reveal };
})();
