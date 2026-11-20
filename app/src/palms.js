// Poster dressing for the cover: palm silhouettes, a sunset sun, a halftone
// band and film grain. Everything here is drawn by hand on the canvas, so
// the cover needs no artwork file. The grain uses a seeded generator, so the
// same cover always draws the same grain.

/** A tiny deterministic generator (mulberry32): same seed, same sequence. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws one palm silhouette: a leaning trunk and a crown of drooping fronds,
 * in `colour`. (x, y) is the base of the trunk, `h` its height, `lean` how
 * far the crown bends (negative bends left), `flip` mirrors the fronds.
 */
export function drawPalm(ctx, x, y, h, lean, flip, colour) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  const topX = x + lean * h;
  const topY = y - h;
  // Trunk: a gentle curve from the base to the crown.
  ctx.lineWidth = Math.max(2, h * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * h * 0.3, y - h * 0.55, topX, topY);
  ctx.stroke();
  // Fronds: arcs fanning out of the crown, each drooping to its tip.
  const dir = flip ? -1 : 1;
  const fronds = [
    [-1.15, -0.55, 0.95], [-0.85, -0.85, 1.0], [-0.45, -1.0, 1.05],
    [0.0, -1.05, 1.0], [0.45, -0.95, 0.95], [0.85, -0.75, 0.9], [1.15, -0.45, 0.8],
  ];
  for (const [fx, fy, len] of fronds) {
    const tipX = topX + dir * fx * h * 0.42 * len;
    const tipY = topY + fy * h * 0.28 * len + h * 0.16;
    const midX = topX + dir * fx * h * 0.3;
    const midY = topY + fy * h * 0.22 - h * 0.08;
    ctx.lineWidth = Math.max(1.5, h * 0.02);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }
  // Coconuts at the crown.
  for (const [cx, cy, r] of [[-0.06, 0.03, 0.035], [0.05, 0.05, 0.03], [0.0, 0.09, 0.028]]) {
    ctx.beginPath();
    ctx.arc(topX + cx * h, topY + cy * h, Math.max(1.5, r * h), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A sunset sun: a disc with a warm radial glow, centred at (cx, cy). */
export function drawSun(ctx, cx, cy, r, top, bottom) {
  const glow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 2.1);
  glow.addColorStop(0, top);
  glow.addColorStop(0.45, bottom);
  glow.addColorStop(1, 'rgba(255, 90, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
  ctx.fill();
  const disc = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
  disc.addColorStop(0, '#fff7d6');
  disc.addColorStop(0.55, '#ffd76a');
  disc.addColorStop(1, '#ff7a3c');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A halftone band: rows of dots whose size swells and fades across the band,
 * the print-shop texture behind the title. `colour` is the dot colour.
 */
export function drawHalftone(ctx, x, y, w, h, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  const step = Math.max(10, h * 0.55);
  for (let row = 0; row < 2; row++) {
    const cy = y + h * (0.3 + row * 0.4);
    for (let cx = x + step / 2; cx < x + w; cx += step) {
      const swell = 0.5 + 0.5 * Math.sin((cx / w) * Math.PI * 2 + row);
      const r = Math.max(1, h * 0.16 * swell);
      ctx.globalAlpha = 0.22 + 0.2 * swell;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Film grain: faint specks over the whole cover, the same every render. */
export function drawGrain(ctx, w, h, seed) {
  const rand = seededRandom(seed);
  ctx.save();
  const count = Math.floor((w * h) / 900);
  for (let i = 0; i < count; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
  }
  ctx.restore();
}

/** A vignette: the corners fall off to dark, the centre stays bright. */
export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,4,18,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
