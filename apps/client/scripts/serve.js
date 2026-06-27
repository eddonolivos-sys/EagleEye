// Servidor estatico minimo (sin dependencias) para el slice del cliente.
//
// - Sirve public/ sobre http://localhost:PORT  (localhost = contexto seguro,
//   asi getUserMedia funciona sin TLS en dev).
// - Cabeceras COOP/COEP -> crossOriginIsolated=true -> habilita SharedArrayBuffer
//   (WASM con hilos de MediaPipe). Ver glosario y ADR de seguridad.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'public');
const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;

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

const server = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent((req.url || '/').split('?')[0]);
    rel = normalize(rel);
    if (rel === '/' || rel === sep) rel = '/index.html';
    let filePath = join(root, rel);

    // Guarda contra path traversal.
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
});

server.listen(PORT, () => {
  console.log(`EagleEye client dev -> http://localhost:${PORT}`);
  console.log('Abre esa URL (localhost es contexto seguro; la camara funciona sin TLS). Ctrl+C para salir.');
});
