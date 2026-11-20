// The cover engine: draws a GTA-style multi-panel poster cover onto any 2D
// canvas context at any size. A cover is a white poster frame, a set of
// photo panels (each with its own photo, zoom and pan), a title band with a
// Vice City sunset sky, palm silhouettes and bold lettering, and a finish of
// grain and vignette. Everything is drawn by hand; the only images are the
// user's own photos.

import { GRADES, gradeLut, applyGrade } from './grades.js';
import { drawPalm, drawSun, drawHalftone, drawGrain, drawVignette } from './palms.js';

/** The post sizes the app exports, in pixels. */
export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 × 1080' },
};

/** The panel layouts: how many panels and how they sit. */
export const LAYOUTS = {
  grid: { label: 'Grid 2 × 2', panels: 4 },
  hero: { label: 'Hero + strip', panels: 4 },
  triptych: { label: 'Triptych', panels: 4 },
  full: { label: 'Full bleed', panels: 1 },
};

/** The default panel assignments: one photo, four different crops of it. */
export function defaultPanels() {
  return [
    { photo: 0, zoom: 1.0, dx: 0, dy: 0 },
    { photo: 0, zoom: 1.5, dx: 0.28, dy: -0.05 },
    { photo: 0, zoom: 1.5, dx: -0.28, dy: 0.1 },
    { photo: 0, zoom: 1.75, dx: 0, dy: 0.25 },
  ];
}

// One reusable offscreen canvas for the per-panel grade pass.
const gradeCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;

/** The panel and title rectangles of a layout, in cover coordinates. */
export function layoutRects(layout, W, H) {
  const frame = Math.max(8, Math.round(W * 0.012));
  const gap = Math.max(6, Math.round(W * 0.009));
  const titleH = Math.round(H * 0.19);
  const ax = frame;
  const ay = frame;
  const aw = W - frame * 2;
  const ah = H - frame * 2 - titleH - gap;
  const panels = [];
  if (layout === 'grid') {
    const cw = (aw - gap) / 2;
    const ch = (ah - gap) / 2;
    panels.push({ x: ax, y: ay, w: cw, h: ch });
    panels.push({ x: ax + cw + gap, y: ay, w: cw, h: ch });
    panels.push({ x: ax, y: ay + ch + gap, w: cw, h: ch });
    panels.push({ x: ax + cw + gap, y: ay + ch + gap, w: cw, h: ch });
  } else if (layout === 'hero') {
    const heroH = ah * 0.62;
    const stripH = ah - heroH - gap;
    const sw = (aw - gap * 2) / 3;
    panels.push({ x: ax, y: ay, w: aw, h: heroH });
    for (let i = 0; i < 3; i++) panels.push({ x: ax + i * (sw + gap), y: ay + heroH + gap, w: sw, h: stripH });
  } else if (layout === 'triptych') {
    const heroW = aw * 0.6;
    const sideW = aw - heroW - gap;
    const sh = (ah - gap * 2) / 3;
    panels.push({ x: ax, y: ay, w: heroW, h: ah });
    for (let i = 0; i < 3; i++) panels.push({ x: ax + heroW + gap, y: ay + i * (sh + gap), w: sideW, h: sh });
  } else {
    // Full bleed: the photo fills the whole inner area, title overlaid.
    panels.push({ x: ax, y: ay, w: aw, h: H - frame * 2 });
  }
  const title = { x: frame, y: H - frame - titleH, w: W - frame * 2, h: titleH };
  return { panels, title, frame, gap };
}

/** Draws one photo into a panel rect, graded, with its white + neon frame. */
function drawPanel(ctx, rect, photo, panel, grade, lut) {
  if (!photo) {
    ctx.fillStyle = '#241335';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    // Grade on a capped offscreen so a big export stays fast, then scale up.
    const cap = 640;
    const scale = Math.min(1, cap / Math.max(rect.w, rect.h));
    const ow = Math.max(2, Math.round(rect.w * scale));
    const oh = Math.max(2, Math.round(rect.h * scale));
    gradeCanvas.width = ow;
    gradeCanvas.height = oh;
    const octx = gradeCanvas.getContext('2d', { willReadFrequently: true });
    const iw = photo.naturalWidth;
    const ih = photo.naturalHeight;
    const base = Math.max(ow / iw, oh / ih);
    const s = base * panel.zoom;
    const dw = iw * s;
    const dh = ih * s;
    // Clamp the pan so the photo always covers the panel, however far it is pushed.
    const maxDx = Math.max(0, (dw - ow) / 2 / ow);
    const maxDy = Math.max(0, (dh - oh) / 2 / oh);
    const pdx = Math.max(-maxDx, Math.min(maxDx, panel.dx ?? 0));
    const pdy = Math.max(-maxDy, Math.min(maxDy, panel.dy ?? 0));
    const dx = (ow - dw) / 2 + pdx * ow;
    const dy = (oh - dh) / 2 + pdy * oh;
    octx.drawImage(photo, dx, dy, dw, dh);
    const data = octx.getImageData(0, 0, ow, oh);
    applyGrade(data, lut, grade.mix);
    octx.putImageData(data, 0, 0);
    ctx.drawImage(gradeCanvas, rect.x, rect.y, rect.w, rect.h);
  }
  // White frame, then a neon accent along the foot of the panel.
  const bw = Math.max(2, Math.round(rect.w * 0.006));
  ctx.lineWidth = bw;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(rect.x + bw / 2, rect.y + bw / 2, rect.w - bw, rect.h - bw);
  ctx.lineWidth = Math.max(1.5, bw * 0.7);
  ctx.strokeStyle = grade.frame;
  ctx.beginPath();
  ctx.moveTo(rect.x + bw, rect.y + rect.h - bw);
  ctx.lineTo(rect.x + rect.w - bw, rect.y + rect.h - bw);
  ctx.stroke();
}

/** Fits a title to a width in Anton, returning the size that fits. */
function fitTitleSize(ctx, text, maxW, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (ctx.measureText(text).width > maxW && size > 24) {
    size -= 4;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  return size;
}

/** The title band: sunset sky, sun, halftone, palms and the lettering. */
function drawTitleBand(ctx, rect, title, subtitle, grade, W, scrim) {
  const { x, y, w, h } = rect;
  if (scrim) {
    // Over a photo: a dark gradient rising from the foot, so the words read.
    const g = ctx.createLinearGradient(0, y - h * 0.7, 0, y + h);
    g.addColorStop(0, 'rgba(16,4,28,0)');
    g.addColorStop(0.55, 'rgba(16,4,28,0.55)');
    g.addColorStop(1, 'rgba(16,4,28,0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y - h * 0.7, w, h * 1.7);
  } else {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#ff2e88');
    g.addColorStop(0.45, '#ff7a3c');
    g.addColorStop(1, '#7a2ea6');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // The sun, rising behind the title.
    drawSun(ctx, x + w / 2, y + h * 0.16, h * 0.52, 'rgba(255,240,180,0.95)', 'rgba(255,120,60,0.6)');
    drawHalftone(ctx, x, y, w, h * 0.2, '#ffffff');
  }
  // Palms at the ends of the band.
  const palmH = h * 0.92;
  drawPalm(ctx, x + w * 0.055, y + h, palmH, -0.16, false, 'rgba(22,5,36,0.94)');
  drawPalm(ctx, x + w * 0.945, y + h, palmH * 0.88, 0.16, true, 'rgba(22,5,36,0.94)');
  // Title: Anton capitals, sunset-gradient fill, dark outline, pink shadow.
  const words = (title || 'VICE CITY').trim().toUpperCase();
  const cx = x + w / 2;
  const titleSize = fitTitleSize(ctx, words, w * 0.86, Math.round(h * 0.52));
  const titleY = y + h * 0.56;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const fill = ctx.createLinearGradient(0, titleY - titleSize * 0.55, 0, titleY + titleSize * 0.55);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.55, '#ffe9a8');
  fill.addColorStop(1, '#ff9a5c');
  ctx.font = `${titleSize}px Anton, 'Arial Narrow', sans-serif`;
  ctx.shadowColor = grade.frame;
  ctx.shadowBlur = titleSize * 0.16;
  ctx.shadowOffsetX = titleSize * 0.03;
  ctx.shadowOffsetY = titleSize * 0.045;
  ctx.fillStyle = fill;
  ctx.fillText(words, cx, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = Math.max(2, titleSize * 0.085);
  ctx.strokeStyle = '#1c0a2e';
  ctx.strokeText(words, cx, titleY);
  ctx.fillStyle = fill;
  ctx.fillText(words, cx, titleY);
  // Subtitle: a neon script line under the title.
  const sub = (subtitle || '').trim();
  if (sub) {
    const subSize = Math.max(14, Math.round(h * 0.2));
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.shadowColor = grade.frame;
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, cx, y + h * 0.86);
    ctx.shadowBlur = 0;
  }
  // A small poster tag in the corner.
  ctx.font = `bold ${Math.max(9, Math.round(h * 0.075))}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('EST. 2026', x + w - w * 0.02, y + h - h * 0.09);
  ctx.textAlign = 'center';
}

/**
 * Draws the whole cover into `ctx` at W by H from `state`:
 * { layout, grade, title, subtitle, panels, photos }.
 * Returns the panel rectangles (in cover coordinates) for hit-testing.
 */
export function drawCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const lut = gradeLut(grade);
  const { panels, title, frame } = layoutRects(state.layout, W, H);
  // The poster's white frame.
  ctx.fillStyle = '#f5efe4';
  ctx.fillRect(0, 0, W, H);
  const photoAt = (i) => state.photos[(state.panels[i] ?? {}).photo ?? 0]?.img ?? null;
  if (state.layout === 'full') {
    drawPanel(ctx, panels[0], photoAt(0), state.panels[0] ?? defaultPanels()[0], grade, lut);
    drawTitleBand(ctx, title, state.title, state.subtitle, grade, W, true);
  } else {
    const count = LAYOUTS[state.layout]?.panels ?? 4;
    for (let i = 0; i < count; i++) {
      drawPanel(ctx, panels[i], photoAt(i), state.panels[i] ?? defaultPanels()[i], grade, lut);
    }
    drawTitleBand(ctx, title, state.title, state.subtitle, grade, W, false);
  }
  drawGrain(ctx, W, H, 20261120);
  drawVignette(ctx, W, H);
  // The neon line inside the white frame.
  ctx.lineWidth = Math.max(2, Math.round(W * 0.002));
  ctx.strokeStyle = grade.frame;
  ctx.strokeRect(frame / 2, frame / 2, W - frame, H - frame);
  return { panels, title };
}

/** Renders a cover to a fresh canvas at the named size and returns it. */
export function renderCoverToCanvas(state, sizeKey) {
  const size = SIZES[sizeKey] ?? SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas.getContext('2d'), size.w, size.h, state);
  return canvas;
}
