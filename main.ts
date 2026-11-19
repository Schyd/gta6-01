// SOLMAR — Streets of the Sun
// Build entry: copy game/ and screenshots/ into the output directory, then
// write dossier.json with the vendored make.fun library. The output directory
// comes from MAKEFUN_OUTPUT_DIR, or /output by default. buildDossier reads
// game/ and screenshots/ from the entry directory itself and returns the
// dossier as canonical JSON bytes.

import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

async function main() {
  await mkdir(outDir, { recursive: true });
  await cp(join(__dirname, 'game'), join(outDir, 'game'), { recursive: true });
  await cp(join(__dirname, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

  const bytes = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  await writeFile(join(outDir, 'dossier.json'), bytes);
  const dossier = JSON.parse(new TextDecoder().decode(bytes));
  console.log(`dossier written: ${join(outDir, 'dossier.json')}`);
  console.log(`dossier bytes: ${bytes.length}, schema: ${dossier.schema}`);
  console.log(`images: ${dossier.images.length}, cover: ${dossier.images[dossier.cover]?.sha256?.slice(0, 12)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
