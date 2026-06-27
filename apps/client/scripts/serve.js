// Servidor estatico minimo (sin dependencias de runtime) para el slice del cliente.
//
//   pnpm --filter @eagleeye/client run dev         -> http  (escritorio via localhost)
//   pnpm --filter @eagleeye/client run dev:https    -> https (movil via IP de LAN)
//
// getUserMedia exige CONTEXTO SEGURO: localhost cuenta como seguro, pero http://IP
// NO. Por eso el movil necesita HTTPS. Cabeceras COOP/COEP -> crossOriginIsolated
// -> habilita SharedArrayBuffer (WASM con hilos de MediaPipe).

import { createServer as createHttp } from 'node:http';
import { createServer as createHttps } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevCert, lanIPv4s } from './cert.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'public');
const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const useHttps = process.argv.includes('--https') || process.env.HTTPS === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
async function handler(req, res) {
  try {
    let rel = decodeURIComponent((req.url || '/').split('?')[0]);
    rel = normalize(rel);
    if (rel === '/' || rel === sep) rel = '/index.html';
    let filePath = join(root, rel);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    let s;
    try {
      s = await stat(filePath);
    } catch {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (e) {
    res.writeHead(500);
    res.end('error: ' + (e instanceof Error ? e.message : String(e)));
  }
}

const ips = lanIPv4s();

/** @param {'http'|'https'} scheme */
function printUrls(scheme) {
  console.log(`EagleEye client dev (${scheme}) — puerto ${PORT}:`);
  console.log(`  ${scheme}://localhost:${PORT}     (escritorio, en esta máquina)`);
  for (const ip of ips) console.log(`  ${scheme}://${ip}:${PORT}   <- abre ESTA en el móvil`);
  if (scheme === 'https') {
    console.log('Certificado autofirmado: el navegador móvil avisará una vez; pulsa "Avanzado → continuar".');
  } else {
    console.log('AVISO: por http://IP la cámara NO funciona en móvil (contexto no seguro).');
    console.log('       Usa: pnpm --filter @eagleeye/client run dev:https');
  }
  console.log('Ctrl+C para salir.');
}

if (useHttps) {
  const { key, cert } = await ensureDevCert(join(here, '..', '.certs'), ips);
  createHttps({ key, cert }, handler).listen(PORT, () => printUrls('https'));
} else {
  createHttp(handler).listen(PORT, () => printUrls('http'));
}
