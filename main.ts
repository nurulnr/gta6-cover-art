// Neon Cover Lab's entry program (Node 22, standard library only): the app is
// the static files in this directory's app/ folder, which a desktop browser
// loads offline (app/index.html and its ES modules, no library and no network
// request), and this program hands it in. It copies app/ and screenshots/
// from beside this file into /output and writes /output/dossier.json, the
// summary the judge reads, using the vendored make.fun library. The cover
// maker turns a person's photos and a caption into a GTA-style multi-panel
// poster with a Vice City sunset or neon grade, exported as a PNG in
// 1080 x 1080, 1080 x 1350 and 1920 x 1080. Its two sample photos
// (app/samples/) were made for make.fun with an image model and are free to
// use. The two fonts (app/fonts/) are SIL Open Font Licensed.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's caps (reference/gate.json): only text_max_bytes shapes the
// dossier's bytes; the rest refuse an entry the scorer would refuse — more
// than 4 screenshots or one over 256 KiB, more than 993 files in app/ or
// 48 MiB of app files, or a path under app/ over 1000 bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
