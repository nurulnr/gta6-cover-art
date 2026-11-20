# Neon Cover Lab — GTA 6-style cover maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/nurulnr/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/nurulnr/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A web app that turns any photo and a caption into GTA-style cover art: a
multi-panel poster with bold caption lettering and a Vice City sunset or neon
colour grade, exported as a PNG to share. It runs entirely offline in a
desktop browser — photos are read on your own machine and never uploaded.

## What it does

- **The art** — four panel layouts (Grid 2×2, Hero + strip, Triptych,
  Full bleed), a sunset sky title band with palm silhouettes, a halftone
  strip, film grain and a vignette, and Anton title lettering with a
  sunset-gradient fill plus a neon Pacifico script subtitle.
- **Any photo** — upload your own photos, or use the two built-in samples.
  Click a panel in the preview to crop and position it (zoom, pan) and pick
  which photo fills it; one photo can fill several panels with different
  crops, or each panel can hold a different photo. Edit the title and the
  subtitle freely.
- **Fast and easy** — a photo loads on start, the preview is live, and one
  click exports the cover in 1080×1080, 1080×1350 and 1920×1080 (or all
  three at once).
- **Original** — no Rockstar logo, artwork or font. The lettering uses
  Anton and Pacifico (SIL Open Font License, under `app/fonts/`), and the
  palms, sun, halftone and grain are all drawn by hand on the canvas.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — a sample photo loads on start. Pick a
layout and a grade, type a caption, click a panel to crop it, and export.

To render a cover alone (for a screenshot), open
`http://localhost:8080/?shot=cover` — `size` picks the post size
(`landscape`, `portrait`, `square`), `photo` the sample, `caption` and
`subtitle` the words, `layout` and `grade` the look.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The program copies `app/` and `screenshots/` to `$MAKEFUN_OUTPUT_DIR`
(or `/output` in the grader) and writes `dossier.json` there. It is
deterministic: two runs write the same bytes.

This entry is MIT licensed.
