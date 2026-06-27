// Auto-aloja (vendoring) los assets de MediaPipe en public/vendor/ con
// verificacion de integridad. Cumple ADR-0003: nada se hot-linkea desde un CDN
// en runtime; los assets se sirven desde nuestro propio origen y estan pineados.
//
// Uso: pnpm --filter @eagleeye/client run vendor
// (la carpeta public/vendor/ esta en .gitignore; se regenera con este script)

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, copyFileSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const clientRoot = join(here, '..');
const vendorDir = join(clientRoot, 'public', 'vendor');
const tvOut = join(vendorDir, 'tasks-vision');
const modelOut = join(vendorDir, 'models', 'face_landmarker.task');

const require = createRequire(import.meta.url);
// El paquete no exporta ./package.json; resolvemos su entry point y subimos al raiz.
const tvRoot = dirname(require.resolve('@mediapipe/tasks-vision'));

// Modelo pineado por URL + SHA-256 (face_landmarker float16 v1).
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MODEL_SHA256 = '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';

/** @param {Buffer} buf */
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// 1) Bundle ESM + binarios WASM de tasks-vision.
mkdirSync(join(tvOut, 'wasm'), { recursive: true });
copyFileSync(join(tvRoot, 'vision_bundle.mjs'), join(tvOut, 'vision_bundle.mjs'));
const wasmSrc = join(tvRoot, 'wasm');
let wasmCount = 0;
for (const f of readdirSync(wasmSrc)) {
  copyFileSync(join(wasmSrc, f), join(tvOut, 'wasm', f));
  wasmCount++;
}

// 2) Modelo, con verificacion de integridad (descarga solo si falta o no coincide).
mkdirSync(dirname(modelOut), { recursive: true });
const present = existsSync(modelOut) && sha256(readFileSync(modelOut)) === MODEL_SHA256;
if (!present) {
  process.stdout.write('vendor: descargando face_landmarker.task ...\n');
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`descarga fallo: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = sha256(buf);
  if (got !== MODEL_SHA256) {
    throw new Error(`SHA-256 del modelo no coincide.\n  esperado: ${MODEL_SHA256}\n  obtenido: ${got}`);
  }
  writeFileSync(modelOut, buf);
}

console.log(`vendor: OK -> ${vendorDir}`);
console.log(`  tasks-vision: vision_bundle.mjs + ${wasmCount} archivos wasm`);
console.log(`  modelo: face_landmarker.task (sha-256 verificado)`);
