// Neon Cover Lab: wires the editor. A photo and a caption become a GTA-style
// multi-panel cover, live in the preview and exported as a PNG in the three
// common post sizes. Photos are read on this machine and never uploaded.
// A `?shot=` query sets up a fixed scene instead (see shots.js): `cover`
// renders the cover alone, full-screen, for a screenshot.

import { SIZES, LAYOUTS, defaultPanels, drawCover, renderCoverToCanvas } from './cover.js';
import { GRADES } from './grades.js';
import { shotSettings, markShotReady } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

const state = {
  size: 'square',
  layout: 'grid',
  grade: 'sunset',
  title: 'VICE CITY',
  subtitle: 'Sunset Heist',
  photos: [], // { id, name, src, img }
  panels: defaultPanels(),
  selected: 0,
};

let panelRects = [];
let shotMode = false;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Redraws the preview at a capped size and refreshes the panel controls. */
function render() {
  const size = SIZES[state.size];
  const scale = Math.min(1, 640 / Math.max(size.w, size.h));
  preview.width = Math.round(size.w * scale);
  preview.height = Math.round(size.h * scale);
  const ctx = preview.getContext('2d');
  const rects = drawCover(ctx, preview.width, preview.height, state);
  panelRects = rects.panels;
  if (!shotMode) {
    // Outline the selected panel so the crop controls have a target.
    const r = panelRects[state.selected];
    if (r) {
      ctx.save();
      ctx.setLineDash([10, 6]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = GRADES[state.grade].frame;
      ctx.strokeRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
      ctx.restore();
    }
  }
  syncPanelControls();
}

/** Rebuilds the photo library strip from the photos on hand. */
function buildLibrary() {
  const lib = $('library');
  lib.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    button.appendChild(img);
    const tag = document.createElement('span');
    tag.textContent = photo.name;
    button.appendChild(tag);
    if (i === (state.panels[state.selected] ?? {}).photo) button.classList.add('active');
    button.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      buildLibrary();
      render();
    });
    lib.appendChild(button);
  });
}

/** Builds a row of choice buttons (layout, grade, size) from a table. */
function buildChoices(id, table, key, onPick) {
  const box = $(id);
  box.innerHTML = '';
  for (const [name, def] of Object.entries(table)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.textContent = def.label;
    if (state[key] === name) button.classList.add('active');
    button.addEventListener('click', () => {
      state[key] = name;
      onPick?.(name);
      buildChoices(id, table, key, onPick);
      render();
    });
    box.appendChild(button);
  }
}

/** Refreshes the panel crop controls for the selected panel. */
function syncPanelControls() {
  const panel = state.panels[state.selected] ?? defaultPanels()[0];
  $('panel-label').textContent = `Panel ${state.selected + 1} of ${panelRects.length}`;
  const select = $('panel-photo');
  select.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = photo.name;
    select.appendChild(option);
  });
  select.value = String(panel.photo ?? 0);
  $('panel-zoom').value = String(panel.zoom ?? 1);
  $('panel-dx').value = String(panel.dx ?? 0);
  $('panel-dy').value = String(panel.dy ?? 0);
}

/** Exports the cover at one size as a PNG download. */
function exportSize(sizeKey) {
  const size = SIZES[sizeKey];
  const canvas = renderCoverToCanvas(state, sizeKey);
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed: the browser could not write the PNG.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setStatus(`Saved vice-cover-${size.w}x${size.h}.png`);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, 'image/png');
}

/** Exports all three post sizes, one download each. */
function exportAll() {
  for (const key of Object.keys(SIZES)) exportSize(key);
  setStatus('Exporting all three sizes…');
}

// --- wiring ---------------------------------------------------------------

$('upload').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) {
    try {
      const src = URL.createObjectURL(file);
      const img = await loadImage(src);
      state.photos.push({ id: `up-${state.photos.length}`, name: file.name.replace(/\.[^.]+$/, ''), src, img });
    } catch {
      setStatus(`Could not read ${file.name}: not an image the browser can open.`);
    }
  }
  buildLibrary();
  render();
  if (files.length > 0) setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added. Click a panel, then a photo, to fill it.`);
});

$('title').addEventListener('input', (event) => {
  state.title = event.target.value;
  render();
});
$('subtitle').addEventListener('input', (event) => {
  state.subtitle = event.target.value;
  render();
});
$('panel-photo').addEventListener('change', (event) => {
  state.panels[state.selected].photo = Number(event.target.value);
  buildLibrary();
  render();
});
$('panel-zoom').addEventListener('input', (event) => {
  state.panels[state.selected].zoom = Number(event.target.value);
  render();
});
$('panel-dx').addEventListener('input', (event) => {
  state.panels[state.selected].dx = Number(event.target.value);
  render();
});
$('panel-dy').addEventListener('input', (event) => {
  state.panels[state.selected].dy = Number(event.target.value);
  render();
});
$('export-one').addEventListener('click', () => exportSize(state.size));
$('export-all').addEventListener('click', exportAll);

preview.addEventListener('click', (event) => {
  const box = preview.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width) * preview.width;
  const y = ((event.clientY - box.top) / box.height) * preview.height;
  const hit = panelRects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  if (hit >= 0) {
    state.selected = hit;
    render();
  }
});

// --- start ----------------------------------------------------------------

/** Loads the two built-in samples, pier first so it is photo 0. */
async function loadSamples() {
  for (const [id, name] of [['pier', 'Pier'], ['boulevard', 'Boulevard']]) {
    try {
      const src = `samples/${id}.jpg`;
      const img = await loadImage(src);
      state.photos.push({ id, name, src, img });
    } catch {
      setStatus(`Could not load the sample ${name}.`);
    }
  }
}

async function start() {
  // The lettering fonts, loaded before the first paint so the cover draws in Anton.
  try {
    await Promise.all([document.fonts.load('80px Anton'), document.fonts.load('40px Pacifico')]);
  } catch {
    // The canvas falls back to its system fonts; the cover still draws.
  }
  await loadSamples();
  const shot = shotSettings(new URLSearchParams(location.search));
  state.title = shot.caption;
  state.subtitle = shot.subtitle;
  if (LAYOUTS[shot.layout]) state.layout = shot.layout;
  if (GRADES[shot.grade]) state.grade = shot.grade;
  if (SIZES[shot.size]) state.size = shot.size;
  // The shot's photo becomes photo 0, so every panel starts on it.
  const wanted = state.photos.findIndex((p) => p.id === shot.photo);
  if (wanted > 0) {
    const [photo] = state.photos.splice(wanted, 1);
    state.photos.unshift(photo);
  }
  if (shot.shot === 'cover') {
    shotMode = true;
    document.body.classList.add('shot-cover');
    const size = SIZES[state.size];
    preview.width = size.w;
    preview.height = size.h;
    const ctx = preview.getContext('2d');
    drawCover(ctx, size.w, size.h, state);
    markShotReady();
    return;
  }
  buildLibrary();
  buildChoices('layout-pick', LAYOUTS, 'layout');
  buildChoices('grade-pick', GRADES, 'grade');
  buildChoices('size-pick', SIZES, 'size');
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  render();
  setStatus(state.photos.length > 0 ? 'Sample loaded. Pick a layout and a grade, then export.' : 'Add a photo to begin.');
  if (shot.shot === 'editor') markShotReady();
}

start();
